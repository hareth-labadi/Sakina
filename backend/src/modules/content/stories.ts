/**
 * Stories: feeds, one story with its replies, posting, deleting, reactions and saving.
 */
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { accounts, communities, reactions, replies, replyRelates, savedStories, stories } from '../../db/schema.js';
import { holdReasons } from '../../lib/safety.js';
import { ID_PATTERN, newId, tidy } from '../../lib/text.js';
import {
  findVisibleStory,
  listSummaries,
  notify,
  notifyReaction,
  overLimit,
  POST_LIMITS,
  REACTIONS,
  requireViewer,
  summaryColumns,
  toSummary,
  VEIL_TOPICS,
  viewerOf,
  visibleTo,
  type ContentDeps,
  type Reaction,
  type Viewer
} from './shared.js';

const storyId = z.string().regex(ID_PATTERN);
const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

const feedQuery = z.object({
  community: slug.optional(),
  type: z.enum(['story', 'checkin', 'win']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().max(200).optional()
});

export const newStoryBody = z.object({
  communityId: slug,
  type: z.enum(['story', 'checkin', 'win']),
  title: z.string().trim().min(3).max(120),
  body: z.string().transform(tidy).pipe(z.string().min(1).max(10_000)),
  visibility: z.enum(['public', 'members']),
  veil: z
    .array(z.enum(VEIL_TOPICS))
    .max(VEIL_TOPICS.length)
    .default([])
    .transform((v) => [...new Set(v)]),
  mood: z.enum(['heavy', 'low', 'okay', 'steady', 'light']).optional()
});

const bad = (code = 'invalid') => Object.assign(new Error(code), { statusCode: 400, code });

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw bad();
  return r.data;
}

/** Reaction counts of a story, every kind present (0 when nobody chose it). */
async function reactionCounts(deps: ContentDeps, id: string): Promise<Record<Reaction, number>> {
  const rows = await deps.db.select({ kind: reactions.kind, n: count() }).from(reactions).where(eq(reactions.storyId, id)).groupBy(reactions.kind);
  const out = Object.fromEntries(REACTIONS.map((r) => [r, 0])) as Record<Reaction, number>;
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

async function myReactions(deps: ContentDeps, id: string, accountId: string): Promise<Reaction[]> {
  const rows = await deps.db
    .select({ kind: reactions.kind })
    .from(reactions)
    .where(and(eq(reactions.storyId, id), eq(reactions.accountId, accountId)));
  return rows.map((r) => r.kind);
}

/** Replies the viewer may see, as a two-level tree (the web app's Reply shape). */
async function replyTree(deps: ContentDeps, viewer: Viewer, id: string) {
  const rows = await deps.db
    .select({
      r: replies,
      nickname: accounts.nickname,
      avatar: accounts.avatar,
      role: accounts.role,
      therapistKind: accounts.therapistKind,
      relateCount: sql<number>`(select count(*)::int from ${replyRelates} where ${replyRelates.replyId} = ${replies.id})`
    })
    .from(replies)
    .innerJoin(accounts, eq(accounts.id, replies.authorId))
    .where(and(eq(replies.storyId, id), visibleTo(viewer, replies)))
    .orderBy(asc(replies.createdAt), asc(replies.id));

  const related = new Set(
    viewer.account && rows.length
      ? (
          await deps.db
            .select({ id: replyRelates.replyId })
            .from(replyRelates)
            .where(and(eq(replyRelates.accountId, viewer.account.id), inArray(replyRelates.replyId, rows.map((x) => x.r.id))))
        ).map((x) => x.id)
      : []
  );

  type ReplyOut = {
    id: string;
    authorNickname: string;
    authorAvatar: number;
    text: string;
    createdAt: string;
    therapist?: 'psychologist' | 'psychiatrist';
    relateCount: number;
    related?: boolean;
    mine?: true;
    held?: true;
    replies?: ReplyOut[];
  };
  const toReply = (x: (typeof rows)[number]): ReplyOut => ({
    id: x.r.id,
    authorNickname: x.nickname,
    authorAvatar: x.avatar,
    text: x.r.text,
    createdAt: x.r.createdAt.toISOString(),
    ...(x.role === 'therapist' && x.therapistKind && { therapist: x.therapistKind }),
    relateCount: x.relateCount,
    ...(viewer.account && { related: related.has(x.r.id) }),
    ...(viewer.account?.id === x.r.authorId && { mine: true as const }),
    ...(x.r.status === 'held' && { held: true as const })
  });

  const top = rows.filter((x) => !x.r.parentId).map(toReply);
  const byId = new Map(top.map((r) => [r.id, r]));
  // A child whose parent the viewer can't see is dropped with it.
  for (const x of rows) {
    const parent = x.r.parentId ? byId.get(x.r.parentId) : undefined;
    if (parent) (parent.replies ??= []).push(toReply(x));
  }
  return top;
}

export async function storyRoutes(app: FastifyInstance, deps: ContentDeps) {
  const { db, config } = deps;

  /** Feed: all communities (home page) or one, optionally one post type. */
  app.get('/stories', async (req) => {
    const q = parse(feedQuery, req.query);
    const viewer = await viewerOf(db, config, req);
    const where = [];
    if (q.community) where.push(eq(stories.communityId, q.community));
    if (q.type) where.push(eq(stories.type, q.type));
    return listSummaries(db, viewer, where, q.limit, q.before);
  });

  /** One story. Guests get members-only stories as `locked`, without text or replies. */
  app.get('/stories/:id', async (req, reply) => {
    const { id } = parse(z.object({ id: storyId }), req.params);
    const viewer = await viewerOf(db, config, req);
    const row = await findVisibleStory(db, viewer, id);
    if (!row) return reply.status(404).send({ error: 'not_found' });

    const summary = toSummary(row, viewer);
    const reactionsNow = await reactionCounts(deps, id);
    if (!viewer.account && row.story.visibility === 'members') {
      return { ...summary, body: '', reactions: reactionsNow, replies: [], locked: true };
    }
    return {
      ...summary,
      body: row.story.body,
      reactions: reactionsNow,
      replies: await replyTree(deps, viewer, id),
      ...(viewer.account && {
        viewer: {
          reactions: await myReactions(deps, id, viewer.account.id),
          saved: Boolean(
            (
              await db
                .select({ id: savedStories.storyId })
                .from(savedStories)
                .where(and(eq(savedStories.accountId, viewer.account.id), eq(savedStories.storyId, id)))
                .limit(1)
            ).length
          ),
          isAuthor: viewer.account.id === row.story.authorId
        }
      })
    };
  });

  /** Post a story. Held for a moderator when it contains identifying details or the community is high-sensitivity. */
  app.post('/stories', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const body = parse(newStoryBody, req.body);
    const [community] = await db.select().from(communities).where(eq(communities.id, body.communityId));
    if (!community || community.status !== 'active') return reply.status(400).send({ error: 'unknown_community' });
    if (await overLimit(db, stories, stories.authorId, stories.createdAt, viewer.account.id, POST_LIMITS.stories)) {
      return reply.status(429).send({ error: 'post_limit' });
    }

    const reasons = holdReasons({ text: `${body.title}\n${body.body}`, communitySensitivity: community.sensitivity, authorRole: viewer.account.role });
    const [created] = await db
      .insert(stories)
      .values({
        id: newId(),
        communityId: body.communityId,
        authorId: viewer.account.id,
        type: body.type,
        title: body.title,
        body: body.body,
        visibility: body.visibility,
        veil: body.veil,
        mood: body.mood ?? null,
        status: reasons.length ? 'held' : 'published',
        heldReasons: reasons
      })
      .returning();
    if (reasons.length) await notify(db, { accountId: viewer.account.id, kind: 'held', storyId: created!.id });

    const story = toSummary({ story: created!, authorNickname: viewer.account.nickname, authorAvatar: viewer.account.avatar, reactionTotal: 0 }, viewer);
    return reply.status(201).send({ story });
  });

  /** The author deletes for good; a moderator removes (kept for the record, hidden from everyone). */
  app.delete('/stories/:id', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id } = parse(z.object({ id: storyId }), req.params);
    const [row] = await db.select({ authorId: stories.authorId, status: stories.status }).from(stories).where(eq(stories.id, id));
    if (!row || row.status === 'removed') return reply.status(404).send({ error: 'not_found' });
    if (row.authorId === viewer.account.id) await db.delete(stories).where(eq(stories.id, id));
    else if (viewer.moderates) await db.update(stories).set({ status: 'removed' }).where(eq(stories.id, id));
    else return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });

  /* ---------- reactions ---------- */

  const reactionParams = z.object({ id: storyId, kind: z.enum(REACTIONS) });

  /** Add one of my reactions (idempotent). Answers the new counts and my reactions. */
  app.put('/stories/:id/reactions/:kind', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id, kind } = parse(reactionParams, req.params);
    const row = await findVisibleStory(db, viewer, id);
    if (!row || row.story.status !== 'published') return reply.status(404).send({ error: 'not_found' });
    const added = await db.insert(reactions).values({ storyId: id, accountId: viewer.account.id, kind }).onConflictDoNothing().returning();
    if (added.length) await notifyReaction(db, row.story.authorId, id, viewer.account.id);
    return { reactions: await reactionCounts(deps, id), mine: await myReactions(deps, id, viewer.account.id) };
  });

  app.delete('/stories/:id/reactions/:kind', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id, kind } = parse(reactionParams, req.params);
    const row = await findVisibleStory(db, viewer, id);
    if (!row) return reply.status(404).send({ error: 'not_found' });
    await db.delete(reactions).where(and(eq(reactions.storyId, id), eq(reactions.accountId, viewer.account.id), eq(reactions.kind, kind)));
    return { reactions: await reactionCounts(deps, id), mine: await myReactions(deps, id, viewer.account.id) };
  });

  /* ---------- saved ---------- */

  /** My saved stories, most recently saved first. Ones I can no longer see drop out. */
  app.get('/me/saved', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const rows = await db
      .select(summaryColumns)
      .from(savedStories)
      .innerJoin(stories, eq(stories.id, savedStories.storyId))
      .innerJoin(accounts, eq(accounts.id, stories.authorId))
      .where(and(eq(savedStories.accountId, viewer.account.id), visibleTo(viewer, stories)))
      .orderBy(desc(savedStories.savedAt))
      .limit(200);
    return { stories: rows.map((r) => toSummary(r, viewer)) };
  });

  app.put('/me/saved/:id', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id } = parse(z.object({ id: storyId }), req.params);
    if (!(await findVisibleStory(db, viewer, id))) return reply.status(404).send({ error: 'not_found' });
    await db.insert(savedStories).values({ accountId: viewer.account.id, storyId: id }).onConflictDoNothing();
    return reply.status(204).send();
  });

  app.delete('/me/saved/:id', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id } = parse(z.object({ id: storyId }), req.params);
    await db.delete(savedStories).where(and(eq(savedStories.accountId, viewer.account.id), eq(savedStories.storyId, id)));
    return reply.status(204).send();
  });
}
