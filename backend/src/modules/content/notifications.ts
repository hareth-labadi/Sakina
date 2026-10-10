/**
 * A member's notifications: what happened to their own content. Never "who is online".
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { notifications, stories } from '../../db/schema.js';
import { nicknamesOf, requireViewer, unreadCount, type ContentDeps } from './shared.js';

export async function notificationRoutes(app: FastifyInstance, deps: ContentDeps) {
  const { db } = deps;

  /** Newest first (the 50 most recent), in the web app's AppNotification shape. */
  app.get('/me/notifications', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const rows = await db
      .select({ n: notifications, storyTitle: stories.title })
      .from(notifications)
      .innerJoin(stories, eq(stories.id, notifications.storyId))
      .where(eq(notifications.accountId, viewer.account.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    const actors = await nicknamesOf(db, [...new Set(rows.map((r) => r.n.actorId).filter((x): x is string => Boolean(x)))]);
    return {
      notifications: rows.map(({ n, storyTitle }) => ({
        id: n.id,
        kind: n.kind,
        storyId: n.storyId,
        storyTitle,
        ...(n.actorId && actors.has(n.actorId) && { actor: actors.get(n.actorId) }),
        ...(n.count !== null && { count: n.count }),
        createdAt: n.createdAt.toISOString(),
        read: n.readAt !== null
      })),
      unread: await unreadCount(db, viewer.account.id)
    };
  });

  /** Mark one (`id`) or all as read. Answers how many are still unread. */
  app.post('/me/notifications/read', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const parsed = z.object({ id: z.uuid().optional() }).safeParse(req.body ?? {});
    if (!parsed.success) return reply.status(400).send({ error: 'invalid' });
    const mine = and(eq(notifications.accountId, viewer.account.id), isNull(notifications.readAt));
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(parsed.data.id ? and(mine, eq(notifications.id, parsed.data.id)) : mine);
    return { unread: await unreadCount(db, viewer.account.id) };
  });
}
