/**
 * Builds the Fastify app without starting it, so tests can call it with `app.inject()`.
 *
 * Every route is served from the root (/health, /auth/…). In the browser the API lives under
 * /api on the web origin: Next.js forwards /api/* here, so cookies stay first-party.
 */
import helmet from '@fastify/helmet';
import Fastify, { type FastifyError, type FastifyServerOptions } from 'fastify';
import { sql } from 'drizzle-orm';
import type { Config } from './config.js';
import type { Db } from './db/client.js';

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

export async function buildServer(config: Config, db: Db) {
  const app = Fastify({
    logger: loggerOptions(config),
    // Behind the web server: trust only the immediate proxy, so a client can't fake its IP
    // by sending its own X-Forwarded-For.
    trustProxy: (_address, hop) => hop === 0,
    bodyLimit: 64 * 1024
  });

  // JSON only, never rendered as a page: no CSP needed, the rest of helmet's headers still apply.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Unexpected errors: log the details, send the client nothing it could learn from.
  app.setErrorHandler<FastifyError>((err, req, reply) => {
    const status = err.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err }, 'request failed');
      return reply.status(500).send({ error: 'internal' });
    }
    return reply.status(status).send({ error: err.code ?? 'bad_request' });
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

  return app;
}
