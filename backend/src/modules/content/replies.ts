/**
 * Replies (one level of nesting), "I relate", reports and blocks.
 */
import { and, count, eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { accounts, blocks, replies, replyRelates, reports } from '../../db/schema.js';
import { nicknameKey } from '../../lib/nickname.js';
import { holdReasons } from '../../lib/safety.js';
import { ID_PATTERN, newId, tidy } from '../../lib/text.js';
import { findVisibleRoomMessage } from './rooms.js';
import { findVisibleStory, notify, overLimit, POST_LIMITS, requireViewer, visibleTo, type ContentDeps, type Viewer } from './shared.js';

const id = z.string().regex(ID_PATTERN);
const bad = () => Object.assign(new Error('invalid'), { statusCode: 400, code: 'invalid' });
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw bad();
  return r.data;
}

const newReplyBody = z.object({
  text: z.string().transform(tidy).pipe(z.string().min(1).max(2_000)),
  parentId: id.optional()
});

const reportBody = z
  .object({
    storyId: id.optional(),
    replyId: id.optional(),
    roomMessageId: id.optional(),
    reason: z.enum(['unsafe', 'harassment', 'medical', 'personal', 'spam', 'other']),
    note: z.string().trim().max(500).default(''),
    /** Also block the author (they aren't told). */
    block: z.boolean().default(false)
  })
  .refine((b) => [b.storyId, b.replyId, b.roomMessageId].filter(Boolean).length === 1, 'exactly one of storyId, replyId or roomMessageId');

/** A reply this viewer may see, with its story. */
async function findVisibleReply(db: Db, viewer: Viewer, replyId: string) {
  const [row] = await db
    .select({ reply: replies })
    .from(replies)
    .where(and(eq(replies.id, replyId), visibleTo(viewer, replies)))
    .limit(1);
  if (!row) return null;
  const story = await findVisibleStory(db, viewer, row.reply.storyId);
  return story ? { reply: row.reply, story } : null;
}

/**
 * Who hears about a published reply: the story's author ("therapist" when a therapist wrote it),
 * and the author of the reply it answers.
 */
export async function notifyReply(db: Db, r: { storyId: string; parentId: string | null; authorId: string }, storyAuthorId: string) {
  const [author] = await db.select({ role: accounts.role }).from(accounts).where(eq(accounts.id, r.authorId));
  await notify(db, { accountId: storyAuthorId, kind: author?.role === 'therapist' ? 'therapist' : 'reply', storyId: r.storyId, actorId: r.authorId });
  if (r.parentId) {
    const [parent] = await db.select({ authorId: replies.authorId }).from(replies).where(eq(replies.id, r.parentId));
    if (parent && parent.authorId !== storyAuthorId) await notify(db, { accountId: parent.authorId, kind: 'reply', storyId: r.storyId, actorId: r.authorId });
  }
}

export async function replyRoutes(app: FastifyInstance, deps: ContentDeps) {
  const { db } = deps;

  /** Reply to a story, or to one of its top-level replies. Same hold rules as stories. */
  app.post('/stories/:id/replies', { config: { rateLimit: { max: 60, timeWindow: '1 hour' } } }, async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: storyId } = parse(z.object({ id }), req.params);
    const body = parse(newReplyBody, req.body);

    const story = await findVisibleStory(db, viewer, storyId);
    if (!story || story.story.status !== 'published') return reply.status(404).send({ error: 'not_found' });
    if (body.parentId) {
      const parent = await findVisibleReply(db, viewer, body.parentId);
      // One level only: the parent must be a top-level reply of this story.
      if (!parent || parent.reply.storyId !== storyId || parent.reply.parentId) return reply.status(400).send({ error: 'invalid_parent' });
    }
    if (await overLimit(db, replies, replies.authorId, replies.createdAt, viewer.account.id, POST_LIMITS.replies)) {
      return reply.status(429).send({ error: 'post_limit' });
    }

    const reasons = holdReasons({ text: body.text, communitySensitivity: story.sensitivity, authorRole: viewer.account.role });
    const [created] = await db
      .insert(replies)
      .values({
        id: newId(),
        storyId,
        parentId: body.parentId ?? null,
        authorId: viewer.account.id,
        text: body.text,
        status: reasons.length ? 'held' : 'published',
        heldReasons: reasons
      })
      .returning();
    if (reasons.length) await notify(db, { accountId: viewer.account.id, kind: 'held', storyId });
    else await notifyReply(db, created!, story.story.authorId);

    return reply.status(201).send({
      reply: {
        id: created!.id,
        authorNickname: viewer.account.nickname,
        authorAvatar: viewer.account.avatar,
        text: created!.text,
        createdAt: created!.createdAt.toISOString(),
        ...(viewer.account.role === 'therapist' && viewer.account.therapistKind && { therapist: viewer.account.therapistKind }),
        relateCount: 0,
        related: false,
        mine: true,
        ...(reasons.length && { held: true })
      },
      ...(body.parentId && { parentId: body.parentId })
    });
  });

  /** The author deletes for good; a moderator removes. */
  app.delete('/replies/:id', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: replyId } = parse(z.object({ id }), req.params);
    const [row] = await db.select({ authorId: replies.authorId, status: replies.status }).from(replies).where(eq(replies.id, replyId));
    if (!row || row.status === 'removed') return reply.status(404).send({ error: 'not_found' });
    if (row.authorId === viewer.account.id) await db.delete(replies).where(eq(replies.id, replyId));
    else if (viewer.moderates) await db.update(replies).set({ status: 'removed' }).where(eq(replies.id, replyId));
    else return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });

  /* ---------- I relate ---------- */

  const relateCount = async (replyId: string) =>
    (await db.select({ n: count() }).from(replyRelates).where(eq(replyRelates.replyId, replyId)))[0]?.n ?? 0;

  app.put('/replies/:id/relate', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: replyId } = parse(z.object({ id }), req.params);
    const found = await findVisibleReply(db, viewer, replyId);
    if (!found || found.reply.status !== 'published') return reply.status(404).send({ error: 'not_found' });
    await db.insert(replyRelates).values({ replyId, accountId: viewer.account.id }).onConflictDoNothing();
    return { relateCount: await relateCount(replyId), related: true };
  });

  app.delete('/replies/:id/relate', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: replyId } = parse(z.object({ id }), req.params);
    if (!(await findVisibleReply(db, viewer, replyId))) return reply.status(404).send({ error: 'not_found' });
    await db.delete(replyRelates).where(and(eq(replyRelates.replyId, replyId), eq(replyRelates.accountId, viewer.account.id)));
    return { relateCount: await relateCount(replyId), related: false };
  });

  /* ---------- reports and blocks ---------- */

  /** Report a story, a reply or a room message to the moderators; optionally block its author too. */
  app.post('/reports', { config: { rateLimit: { max: 30, timeWindow: '1 hour' } } }, async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const body = parse(reportBody, req.body);

    let authorId: string;
    if (body.storyId) {
      const story = await findVisibleStory(db, viewer, body.storyId);
      if (!story) return reply.status(404).send({ error: 'not_found' });
      authorId = story.story.authorId;
    } else if (body.replyId) {
      const found = await findVisibleReply(db, viewer, body.replyId);
      if (!found) return reply.status(404).send({ error: 'not_found' });
      authorId = found.reply.authorId;
    } else {
      const message = await findVisibleRoomMessage(db, viewer, body.roomMessageId!);
      if (!message) return reply.status(404).send({ error: 'not_found' });
      authorId = message.authorId;
    }
    if (await overLimit(db, reports, reports.reporterId, reports.createdAt, viewer.account.id, POST_LIMITS.reports)) {
      return reply.status(429).send({ error: 'post_limit' });
    }

    await db.insert(reports).values({
      reporterId: viewer.account.id,
      storyId: body.storyId ?? null,
      replyId: body.replyId ?? null,
      roomMessageId: body.roomMessageId ?? null,
      reason: body.reason,
      note: body.note
    });
    if (body.block && authorId !== viewer.account.id) {
      await db.insert(blocks).values({ blockerId: viewer.account.id, blockedId: authorId }).onConflictDoNothing();
    }
    return reply.status(201).send({ blocked: body.block && authorId !== viewer.account.id });
  });

  /** Nicknames I blocked. */
  app.get('/me/blocks', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const rows = await db
      .select({ nickname: accounts.nickname })
      .from(blocks)
      .innerJoin(accounts, eq(accounts.id, blocks.blockedId))
      .where(eq(blocks.blockerId, viewer.account.id));
    return { nicknames: rows.map((r) => r.nickname) };
  });

  const blockParams = z.object({ nickname: z.string().min(1).max(64) });
  const accountByNickname = async (n: string) =>
    (await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.nicknameKey, nicknameKey(n))))[0]?.id;

  app.put('/me/blocks/:nickname', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const target = await accountByNickname(parse(blockParams, req.params).nickname);
    if (!target || target === viewer.account.id) return reply.status(404).send({ error: 'not_found' });
    await db.insert(blocks).values({ blockerId: viewer.account.id, blockedId: target }).onConflictDoNothing();
    return reply.status(204).send();
  });

  app.delete('/me/blocks/:nickname', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const target = await accountByNickname(parse(blockParams, req.params).nickname);
    if (target) await db.delete(blocks).where(and(eq(blocks.blockerId, viewer.account.id), eq(blocks.blockedId, target)));
    return reply.status(204).send();
  });
}
