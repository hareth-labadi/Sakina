/**
 * Moderation: held content waiting for a decision, and reports. Moderators and admins only.
 * There is no moderator panel page yet; these routes are what it will call. Reporters stay
 * anonymous, even to moderators.
 */
import { and, asc, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { accounts, replies, reports, stories } from '../../db/schema.js';
import { ID_PATTERN } from '../../lib/text.js';
import { notifyReply } from './replies.js';
import { notify, requireViewer, type ContentDeps } from './shared.js';

const decision = z.object({ action: z.enum(['approve', 'remove']) });
const idParams = z.object({ id: z.string().regex(ID_PATTERN) });
const bad = () => Object.assign(new Error('invalid'), { statusCode: 400, code: 'invalid' });
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw bad();
  return r.data;
}

export async function moderationRoutes(app: FastifyInstance, deps: ContentDeps) {
  const { db } = deps;

  /** A moderator, or null after answering 401/403. */
  async function requireModerator(req: FastifyRequest, reply: FastifyReply) {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return null;
    if (!viewer.moderates) {
      void reply.status(403).send({ error: 'forbidden' });
      return null;
    }
    return viewer;
  }

  /** Everything held, oldest first, with the reasons it was held. */
  app.get('/moderation/queue', async (req, reply) => {
    if (!(await requireModerator(req, reply))) return reply;
    const heldStories = await db
      .select({ s: stories, authorNickname: accounts.nickname })
      .from(stories)
      .innerJoin(accounts, eq(accounts.id, stories.authorId))
      .where(eq(stories.status, 'held'))
      .orderBy(asc(stories.createdAt))
      .limit(100);
    const storyOf = alias(stories, 'parent_story');
    const heldReplies = await db
      .select({ r: replies, authorNickname: accounts.nickname, storyTitle: storyOf.title })
      .from(replies)
      .innerJoin(accounts, eq(accounts.id, replies.authorId))
      .innerJoin(storyOf, eq(storyOf.id, replies.storyId))
      .where(eq(replies.status, 'held'))
      .orderBy(asc(replies.createdAt))
      .limit(100);
    return {
      stories: heldStories.map(({ s, authorNickname }) => ({
        id: s.id,
        communityId: s.communityId,
        authorNickname,
        type: s.type,
        title: s.title,
        body: s.body,
        visibility: s.visibility,
        heldReasons: s.heldReasons,
        createdAt: s.createdAt.toISOString()
      })),
      replies: heldReplies.map(({ r, authorNickname, storyTitle }) => ({
        id: r.id,
        storyId: r.storyId,
        storyTitle,
        authorNickname,
        text: r.text,
        heldReasons: r.heldReasons,
        createdAt: r.createdAt.toISOString()
      }))
    };
  });

  /** Approve (publish, tell the author) or remove a held story. */
  app.post('/moderation/stories/:id', async (req, reply) => {
    if (!(await requireModerator(req, reply))) return reply;
    const { id } = parse(idParams, req.params);
    const { action } = parse(decision, req.body);
    const [s] = await db
      .update(stories)
      .set(action === 'approve' ? { status: 'published', heldReasons: [] } : { status: 'removed' })
      .where(and(eq(stories.id, id), eq(stories.status, 'held')))
      .returning();
    if (!s) return reply.status(404).send({ error: 'not_found' });
    if (action === 'approve') await notify(db, { accountId: s.authorId, kind: 'approved', storyId: s.id });
    return reply.status(204).send();
  });

  /** Approve (publish, tell the author and the people it concerns) or remove a held reply. */
  app.post('/moderation/replies/:id', async (req, reply) => {
    if (!(await requireModerator(req, reply))) return reply;
    const { id } = parse(idParams, req.params);
    const { action } = parse(decision, req.body);
    const [r] = await db
      .update(replies)
      .set(action === 'approve' ? { status: 'published', heldReasons: [] } : { status: 'removed' })
      .where(and(eq(replies.id, id), eq(replies.status, 'held')))
      .returning();
    if (!r) return reply.status(404).send({ error: 'not_found' });
    if (action === 'approve') {
      await notify(db, { accountId: r.authorId, kind: 'approved', storyId: r.storyId });
      const [s] = await db.select({ authorId: stories.authorId }).from(stories).where(eq(stories.id, r.storyId));
      if (s) await notifyReply(db, r, s.authorId);
    }
    return reply.status(204).send();
  });

  /** Open reports (newest first), with what was reported. Not who reported it. */
  app.get('/moderation/reports', async (req, reply) => {
    if (!(await requireModerator(req, reply))) return reply;
    const rows = await db.select().from(reports).where(eq(reports.status, 'open')).orderBy(desc(reports.createdAt)).limit(100);
    const out = [];
    for (const r of rows) {
      let target: Record<string, unknown> | null = null;
      if (r.storyId) {
        const [s] = await db
          .select({ id: stories.id, title: stories.title, status: stories.status, authorNickname: accounts.nickname })
          .from(stories)
          .innerJoin(accounts, eq(accounts.id, stories.authorId))
          .where(eq(stories.id, r.storyId));
        if (s) target = { type: 'story', ...s };
      } else if (r.replyId) {
        const [x] = await db
          .select({ id: replies.id, storyId: replies.storyId, text: replies.text, status: replies.status, authorNickname: accounts.nickname })
          .from(replies)
          .innerJoin(accounts, eq(accounts.id, replies.authorId))
          .where(eq(replies.id, r.replyId));
        if (x) target = { type: 'reply', ...x };
      }
      out.push({ id: r.id, reason: r.reason, note: r.note, createdAt: r.createdAt.toISOString(), target });
    }
    return { reports: out };
  });

  app.post('/moderation/reports/:id/resolve', async (req, reply) => {
    if (!(await requireModerator(req, reply))) return reply;
    const parsed = z.object({ id: z.uuid() }).safeParse(req.params);
    if (!parsed.success) return reply.status(400).send({ error: 'invalid' });
    const [r] = await db
      .update(reports)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(and(eq(reports.id, parsed.data.id), eq(reports.status, 'open')))
      .returning({ id: reports.id });
    if (!r) return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });
}
