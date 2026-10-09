/**
 * Builds the Fastify app without starting it, so tests can call it with `app.inject()`.
 *
 * Every route is served from the root (/health, /auth/…). In the browser the API lives under
 * /api on the web origin: Next.js forwards /api/* here, so cookies stay first-party.
 */
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import { createMailer, type Mailer } from './lib/mailer.js';
import { requireSameOrigin } from './lib/same-origin.js';
import { accountRoutes } from './modules/account/routes.js';
import { authRoutes } from './modules/auth/routes.js';

/**
 * Logs never contain secrets or personal data: cookies and auth headers are hidden, and request
 * bodies (passwords, posts, emails) are never logged at all.
 */
export function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  return {
    level: config.NODE_ENV === 'test' ? 'silent' : config.LOG_LEVEL,
    redact: {
      paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
      censor: '[hidden]'
    },
    ...(config.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } })
  };
}

export async function buildServer(config: Config, db: Db, deps: { mailer?: Mailer } = {}) {
  const app = Fastify({
    logger: loggerOptions(config),
    // Client IP (for rate limits) = the last X-Forwarded-For entry, as handed over by the web
    // server. Next keeps an incoming X-Forwarded-For as it is, so in production the site MUST sit
    // behind a proxy or load balancer that sets or appends the real client IP; without one
    // (bare `docker compose up`), clients can fake their IP. Per-nickname lockout doesn't depend on it.
    trustProxy: (_address, hop) => hop === 0,
    bodyLimit: 64 * 1024
  });

  // JSON only, never rendered as a page: no CSP needed, the rest of helmet's headers still apply.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie);
  // Per client IP. Routes set their own tighter limits; this is the ceiling for everything else.
  // In memory: fine for one API instance; move to a shared store (Redis) before running several.
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({ statusCode: ctx.statusCode, code: 'rate_limited', message: 'rate limited' })
  });
  requireSameOrigin(app, config.PUBLIC_WEB_URL);

  // Unexpected errors: log the details, send the client nothing it could learn from.
  app.setErrorHandler<FastifyError>((err, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err }, 'request failed');
      return reply.status(500).send({ error: 'internal' });
    }
    // Our own codes pass through; framework internals (FST_ERR_…) become a plain bad_request.
    const code = err.code && !err.code.startsWith('FST_') ? err.code : 'bad_request';
    return reply.status(status).send({ error: code });
  });

  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: 'not_found' }));

  /** Liveness + database reachability. Used by Docker, the load balancer and uptime checks. */
  app.get('/health', async (req, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: 'ok' };
    } catch (err) {
      req.log.error({ err }, 'health check: database unreachable');
      return reply.status(503).send({ status: 'unavailable' });
    }
  });

  await authRoutes(app, { db, config, mailer: deps.mailer ?? createMailer(config, app.log) });
  await accountRoutes(app, { db, config });

  return app;
}
