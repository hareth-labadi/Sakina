/**
 * Discussion rooms: live group chat. Peer rooms are always open; guided rooms open once a week
 * for their session, led by a therapist.
 *
 * "Live" is plain polling: the room page fetches GET /rooms/:id every few seconds and gets the
 * latest messages back. It works through the web server's /api proxy as it is, needs no extra
 * service, and a moderator's removal disappears for everyone on the next fetch.
 *
 * Messages follow the reply rules: held when they contain identifying details or the room is in a
 * high-sensitivity community (only the author sees them until a moderator decides), blocked
 * authors hidden. Presence is only ever a number, never who.
 */
import { and, asc, count, desc, eq, gt, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { accounts, communities, roomMessages, roomPresence, rooms } from '../../db/schema.js';
import { holdReasons } from '../../lib/safety.js';
import { ID_PATTERN, newId, tidy } from '../../lib/text.js';
import type { SessionAccount } from '../auth/sessions.js';
import { overLimit, POST_LIMITS, requireViewer, viewerOf, visibleTo, type ContentDeps, type Viewer } from './shared.js';

/** Guided sessions are scheduled in Algeria's time (UTC+1, no daylight saving). */
export const ROOM_TIME_ZONE = 'Africa/Algiers';
/** How many of the latest messages a room page gets. */
export const ROOM_WINDOW = 100;
/** Someone counts as "here now" when their page fetched the room this recently. */
const PRESENT_MS = 60_000;

const WEEK_MINUTES = 7 * 24 * 60;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const clock = new Intl.DateTimeFormat('en-US', { timeZone: ROOM_TIME_ZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** Minutes since Sunday 00:00, in the rooms' time zone. */
function minuteOfWeek(at: Date): number {
  const parts = Object.fromEntries(clock.formatToParts(at).map((p) => [p.type, p.value]));
  return DAYS.indexOf(parts.weekday!) * 1440 + Number(parts.hour) * 60 + Number(parts.minute);
}

type RoomRow = typeof rooms.$inferSelect;

/** Is the room open for writing at `at`? A session that starts late on Saturday may run past midnight. */
export function isOpen(room: Pick<RoomRow, 'kind' | 'scheduleDay' | 'scheduleTime' | 'durationMin'>, at = new Date()): boolean {
  if (room.kind === 'peer') return true;
  if (room.scheduleDay === null || !room.scheduleTime) return false;
  const [h, m] = room.scheduleTime.split(':').map(Number);
  const start = room.scheduleDay * 1440 + h! * 60 + m!;
  return (minuteOfWeek(at) - start + WEEK_MINUTES) % WEEK_MINUTES < room.durationMin;
}

const id = z.string().regex(ID_PATTERN);
const roomParams = z.object({ id: z.string().regex(/^[a-z0-9-]{1,40}$/) });
const newMessageBody = z.object({ text: z.string().transform(tidy).pipe(z.string().min(1).max(1_000)) });
const bad = () => Object.assign(new Error('invalid'), { statusCode: 400, code: 'invalid' });
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw bad();
  return r.data;
}

const host = alias(accounts, 'host');
const presentNow = sql<number>`(select count(*)::int from ${roomPresence} where ${roomPresence.roomId} = ${rooms.id} and ${roomPresence.seenAt} > now() - make_interval(secs => ${PRESENT_MS / 1000}))`;
const roomColumns = { room: rooms, sensitivity: communities.sensitivity, hostNickname: host.nickname, hostAvatar: host.avatar, hostKind: host.therapistKind, present: presentNow };
type RoomQueryRow = { room: RoomRow; sensitivity: 'standard' | 'sensitive' | 'high'; hostNickname: string | null; hostAvatar: number | null; hostKind: 'psychologist' | 'psychiatrist' | null; present: number };

const roomQuery = (db: Db) =>
  db.select(roomColumns).from(rooms).innerJoin(communities, eq(communities.id, rooms.communityId)).leftJoin(host, eq(host.id, rooms.hostId));

/** The Room shape of the web app (src/types/domain.ts). */
function toRoom(r: RoomQueryRow, at: Date) {
  const { room } = r;
  return {
    id: room.id,
    kind: room.kind,
    communityId: room.communityId,
    host: r.hostNickname !== null && r.hostKind ? { nickname: r.hostNickname, avatar: r.hostAvatar!, kind: r.hostKind } : null,
    schedule: room.scheduleDay !== null && room.scheduleTime ? { day: room.scheduleDay, time: room.scheduleTime } : null,
    live: isOpen(room, at),
    present: r.present
  };
}

type MessageRow = {
  m: typeof roomMessages.$inferSelect;
  authorNickname: string;
  authorAvatar: number;
  authorRole: SessionAccount['role'];
  authorKind: 'psychologist' | 'psychiatrist' | null;
};

/** The RoomMessage shape of the web app. */
function toMessage(r: MessageRow, viewer: Viewer) {
  return {
    id: r.m.id,
    authorNickname: r.authorNickname,
    authorAvatar: r.authorAvatar,
    text: r.m.text,
    createdAt: r.m.createdAt.toISOString(),
    ...(r.authorRole === 'therapist' && r.authorKind && { therapist: r.authorKind }),
    ...(viewer.account?.id === r.m.authorId && { mine: true }),
    ...(r.m.status === 'held' && { held: true })
  };
}

const messageColumns = {
  m: roomMessages,
  authorNickname: accounts.nickname,
  authorAvatar: accounts.avatar,
  authorRole: accounts.role,
  authorKind: accounts.therapistKind
};

/** The latest messages this viewer may see, oldest first. */
async function latestMessages(db: Db, viewer: Viewer, roomId: string) {
  const rows = await db
    .select(messageColumns)
    .from(roomMessages)
    .innerJoin(accounts, eq(accounts.id, roomMessages.authorId))
    .where(and(eq(roomMessages.roomId, roomId), visibleTo(viewer, roomMessages)))
    .orderBy(desc(roomMessages.createdAt), desc(roomMessages.id))
    .limit(ROOM_WINDOW);
  return rows.reverse().map((r) => toMessage(r, viewer));
}

/** A room message this viewer may see, or null. */
export async function findVisibleRoomMessage(db: Db, viewer: Viewer, messageId: string) {
  const [row] = await db
    .select({ m: roomMessages })
    .from(roomMessages)
    .where(and(eq(roomMessages.id, messageId), visibleTo(viewer, roomMessages)))
    .limit(1);
  return row?.m ?? null;
}

export async function roomRoutes(app: FastifyInstance, deps: ContentDeps) {
  const { db } = deps;

  const findRoom = async (roomId: string) =>
    (await roomQuery(db).where(and(eq(rooms.id, roomId), eq(rooms.archived, false))).limit(1))[0] ?? null;

  app.get('/rooms', async () => {
    const at = new Date();
    const rows = await roomQuery(db).where(eq(rooms.archived, false)).orderBy(asc(rooms.id));
    return { rooms: rows.map((r) => toRoom(r, at)) };
  });

  /**
   * One room and its latest messages. The room page calls this every few seconds; for a signed-in
   * member that also counts them as "here now" while the room is open.
   */
  app.get('/rooms/:id', async (req, reply) => {
    const { id: roomId } = parse(roomParams, req.params);
    const row = await findRoom(roomId);
    if (!row) return reply.status(404).send({ error: 'not_found' });
    const viewer = await viewerOf(db, deps.config, req);
    const at = new Date();
    if (viewer.account && isOpen(row.room, at)) {
      await db
        .insert(roomPresence)
        .values({ roomId, accountId: viewer.account.id, seenAt: at })
        .onConflictDoUpdate({ target: [roomPresence.roomId, roomPresence.accountId], set: { seenAt: at } });
      row.present = (
        await db
          .select({ n: count() })
          .from(roomPresence)
          .where(and(eq(roomPresence.roomId, roomId), gt(roomPresence.seenAt, new Date(at.getTime() - PRESENT_MS))))
      )[0]!.n;
    }
    return { room: toRoom(row, at), messages: await latestMessages(db, viewer, roomId) };
  });

  /** Write in a room. Only while it is open, except for its host (a note before or after the session). */
  app.post('/rooms/:id/messages', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: roomId } = parse(roomParams, req.params);
    const body = parse(newMessageBody, req.body);
    const row = await findRoom(roomId);
    if (!row) return reply.status(404).send({ error: 'not_found' });
    if (!isOpen(row.room) && row.room.hostId !== viewer.account.id) return reply.status(409).send({ error: 'closed' });
    if (await overLimit(db, roomMessages, roomMessages.authorId, roomMessages.createdAt, viewer.account.id, POST_LIMITS.messages)) {
      return reply.status(429).send({ error: 'post_limit' });
    }

    const reasons = holdReasons({ text: body.text, communitySensitivity: row.sensitivity, authorRole: viewer.account.role });
    const [created] = await db
      .insert(roomMessages)
      .values({ id: newId(), roomId, authorId: viewer.account.id, text: body.text, status: reasons.length ? 'held' : 'published', heldReasons: reasons })
      .returning();

    const a = viewer.account;
    return reply.status(201).send({
      message: toMessage({ m: created!, authorNickname: a.nickname, authorAvatar: a.avatar, authorRole: a.role, authorKind: a.therapistKind ?? null }, viewer)
    });
  });

  /** The author deletes for good; a moderator removes. */
  app.delete('/room-messages/:id', async (req, reply) => {
    const viewer = await requireViewer(deps, req, reply);
    if (!viewer) return reply;
    const { id: messageId } = parse(z.object({ id }), req.params);
    const [row] = await db.select({ authorId: roomMessages.authorId, status: roomMessages.status }).from(roomMessages).where(eq(roomMessages.id, messageId));
    if (!row || row.status === 'removed') return reply.status(404).send({ error: 'not_found' });
    if (row.authorId === viewer.account.id) await db.delete(roomMessages).where(eq(roomMessages.id, messageId));
    else if (viewer.moderates) await db.update(roomMessages).set({ status: 'removed' }).where(eq(roomMessages.id, messageId));
    else return reply.status(404).send({ error: 'not_found' });
    return reply.status(204).send();
  });
}
