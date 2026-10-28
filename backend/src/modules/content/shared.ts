/**
 * What every content route needs: who is looking, what they may see, how rows become the shapes
 * the web app uses (src/types/domain.ts), notifications and per-account posting limits.
 *
 * Visibility, in one place:
 * - published content: everyone, except members-only stories, whose text guests don't get;
 * - held content: only its author (and moderators, through the moderation routes);
 * - removed content: nobody;
 * - authors a member blocked: hidden from that member.
 */
import { and, count, desc, eq, gte, inArray, isNull, notInArray, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { accounts, blocks, communities, notifications, reactions, stories } from '../../db/schema.js';
import { excerpt } from '../../lib/text.js';
import { currentAccount, type SessionAccount } from '../auth/sessions.js';

export type ContentDeps = { db: Db; config: Config };

export const REACTIONS = ['relate', 'strength', 'helped', 'thanks'] as const;
export type Reaction = (typeof REACTIONS)[number];
export const VEIL_TOPICS = ['selfharm', 'loss', 'violence', 'abuse', 'food', 'substances'] as const;

/* ---------- viewer ---------- */

export type Viewer = {
  account: SessionAccount | null;
  /** Moderators and admins. */
  moderates: boolean;
  /** Authors this member blocked. */
  blocked: string[];
};

export async function viewerOf(db: Db, config: Config, req: FastifyRequest): Promise<Viewer> {
  const s = await currentAccount(db, config, req);
  if (!s) return { account: null, moderates: false, blocked: [] };
  const rows = await db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, s.account.id));
  return { account: s.account, moderates: s.account.role === 'moderator' || s.account.role === 'admin', blocked: rows.map((r) => r.id) };
}

/** A signed-in viewer, or null after answering 401. */
export async function requireViewer(deps: ContentDeps, req: FastifyRequest, reply: FastifyReply) {
  const v = await viewerOf(deps.db, deps.config, req);
  if (!v.account) {
    void reply.status(401).send({ error: 'unauthenticated' });
    return null;
  }
  return v as Viewer & { account: SessionAccount };
}

/** SQL condition: rows of `table` this viewer may see (published, or their own held ones; not blocked authors). */
export function visibleTo(viewer: Viewer, table: { status: PgColumn; authorId: PgColumn }): SQL {
  const own = viewer.account ? and(eq(table.authorId, viewer.account.id), eq(table.status, 'held')) : undefined;
  const status = own ? or(eq(table.status, 'published'), own)! : eq(table.status, 'published');
  return viewer.blocked.length ? and(status, notInArray(table.authorId, viewer.blocked))! : status;
}

/* ---------- story summaries ---------- */

const reactionTotal = sql<number>`(select count(*)::int from ${reactions} where ${reactions.storyId} = ${stories.id})`;

export const summaryColumns = {
  story: stories,
  authorNickname: accounts.nickname,
  authorAvatar: accounts.avatar,
  reactionTotal
};

export type SummaryRow = { story: typeof stories.$inferSelect; authorNickname: string; authorAvatar: number; reactionTotal: number };

/** The StorySummary shape of the web app. Guests get no excerpt of members-only stories. */
export function toSummary(row: SummaryRow, viewer: Viewer) {
  const s = row.story;
  const locked = !viewer.account && s.visibility === 'members';
  return {
    id: s.id,
    communityId: s.communityId,
    authorNickname: row.authorNickname,
    authorAvatar: row.authorAvatar,
    type: s.type,
    title: s.title,
    excerpt: locked ? '' : excerpt(s.body),
    visibility: s.visibility,
    veil: s.veil.length ? s.veil : null,
    ...(s.mood && { mood: s.mood }),
    reactionTotal: row.reactionTotal,
    createdAt: s.createdAt.toISOString(),
    ...(s.status === 'held' && { status: 'held' as const })
  };
}

/** Newest first, `limit` at a time; `before` is the cursor returned with the previous page. */
export async function listSummaries(db: Db, viewer: Viewer, where: SQL[], limit: number, before?: string) {
  const conds = [visibleTo(viewer, stories), ...where];
  const cursor = before ? decodeCursor(before) : null;
  if (cursor) conds.push(sql`(${stories.createdAt}, ${stories.id}) < (${cursor.at}::timestamptz, ${cursor.id})`);
  const rows = await db
    .select(summaryColumns)
    .from(stories)
    .innerJoin(accounts, eq(accounts.id, stories.authorId))
    .where(and(...conds))
    .orderBy(desc(stories.createdAt), desc(stories.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    stories: page.map((r) => toSummary(r, viewer)),
    next: rows.length > limit && last ? encodeCursor(last.story.createdAt, last.story.id) : null
  };
}

const encodeCursor = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');

function decodeCursor(c: string): { at: string; id: string } | null {
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  return at && id && !Number.isNaN(Date.parse(at)) ? { at, id } : null;
}

/** One story this viewer may see (with its author), or null. */
export async function findVisibleStory(db: Db, viewer: Viewer, id: string) {
  const [row] = await db
    .select({ ...summaryColumns, authorRole: accounts.role, sensitivity: communities.sensitivity })
    .from(stories)
    .innerJoin(accounts, eq(accounts.id, stories.authorId))
    .innerJoin(communities, eq(communities.id, stories.communityId))
    .where(and(eq(stories.id, id), visibleTo(viewer, stories)))
    .limit(1);
  return row ?? null;
}

/* ---------- notifications ---------- */

/** Has `accountId` blocked `actorId`? Blocked people don't generate notifications either. */
async function hasBlocked(db: Db, accountId: string, actorId: string) {
  const [row] = await db
    .select({ id: blocks.blockerId })
    .from(blocks)
    .where(and(eq(blocks.blockerId, accountId), eq(blocks.blockedId, actorId)))
    .limit(1);
  return Boolean(row);
}

export async function notify(db: Db, n: { accountId: string; kind: 'reply' | 'therapist' | 'held' | 'approved'; storyId: string; actorId?: string }) {
  if (n.actorId && (n.actorId === n.accountId || (await hasBlocked(db, n.accountId, n.actorId)))) return;
  await db.insert(notifications).values(n);
}

/** Reactions are grouped: the unread "reaction" notification of that story counts up. */
export async function notifyReaction(db: Db, accountId: string, storyId: string, actorId: string) {
  if (actorId === accountId || (await hasBlocked(db, accountId, actorId))) return;
  const bumped = await db
    .update(notifications)
    .set({ count: sql`coalesce(${notifications.count}, 0) + 1`, createdAt: new Date() })
    .where(and(eq(notifications.accountId, accountId), eq(notifications.storyId, storyId), eq(notifications.kind, 'reaction'), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  if (!bumped.length) await db.insert(notifications).values({ accountId, kind: 'reaction', storyId, count: 1 });
}

export async function unreadCount(db: Db, accountId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.accountId, accountId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/* ---------- posting limits ---------- */

/**
 * Per account, on top of the per-IP limits: slows down spam and pile-ons without bothering
 * normal use. Counted in the database, so it holds across API instances.
 */
export const POST_LIMITS = {
  stories: { max: 5, windowMs: 24 * 3_600_000 },
  replies: { max: 30, windowMs: 3_600_000 },
  messages: { max: 120, windowMs: 3_600_000 },
  reports: { max: 20, windowMs: 3_600_000 }
} as const;

/** Has this account already created `limit.max` rows of `table` within the window? */
export async function overLimit(db: Db, table: PgTable, owner: PgColumn, created: PgColumn, accountId: string, limit: { max: number; windowMs: number }) {
  const [row] = await db
    .select({ n: count() })
    .from(table)
    .where(and(eq(owner, accountId), gte(created, new Date(Date.now() - limit.windowMs))));
  return (row?.n ?? 0) >= limit.max;
}

/** Nicknames by account id, for a handful of ids. */
export async function nicknamesOf(db: Db, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db.select({ id: accounts.id, nickname: accounts.nickname }).from(accounts).where(inArray(accounts.id, ids));
  return new Map(rows.map((r) => [r.id, r.nickname]));
}
