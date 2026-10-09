import type { FastifyInstance } from 'fastify';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site request forgery guard: a request that changes anything must carry an Origin header
 * equal to the site's own origin. Browsers always send Origin on POST/PUT/PATCH/DELETE and a page
 * can't fake it, so another site can't make a signed-in member's browser act on Sakina.
 * (The SameSite=Lax cookie is the second layer.)
 */
export function requireSameOrigin(app: FastifyInstance, allowedOrigin: string) {
  app.addHook('onRequest', async (req, reply) => {
    if (SAFE_METHODS.has(req.method)) return;
    if (req.headers.origin !== allowedOrigin) return reply.status(403).send({ error: 'forbidden_origin' });
  });
}
