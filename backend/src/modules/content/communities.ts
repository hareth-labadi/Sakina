/**
 * Live numbers for the communities. Their names and descriptions are UI copy in the web app.
 */
import { and, count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { accountCommunities, communities, stories } from '../../db/schema.js';
import type { ContentDeps } from './shared.js';

export async function communityRoutes(app: FastifyInstance, { db }: ContentDeps) {
  /** Active communities with how many members joined and how many stories are published. */
  app.get('/communities', async () => {
    const [list, members, posts] = await Promise.all([
      db.select().from(communities).where(eq(communities.status, 'active')),
      db.select({ id: accountCommunities.communityId, n: count() }).from(accountCommunities).groupBy(accountCommunities.communityId),
      db
        .select({ id: stories.communityId, n: count() })
        .from(stories)
        .where(and(eq(stories.status, 'published')))
        .groupBy(stories.communityId)
    ]);
    const m = new Map(members.map((r) => [r.id, r.n]));
    const p = new Map(posts.map((r) => [r.id, r.n]));
    return {
      communities: list.map((c) => ({ id: c.id, sensitivity: c.sensitivity, memberCount: m.get(c.id) ?? 0, storyCount: p.get(c.id) ?? 0 }))
    };
  });
}
