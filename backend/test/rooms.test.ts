import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accounts, rooms } from '../src/db/schema.js';
import { isOpen } from '../src/modules/content/rooms.js';
import { client, resetDb, signUpBody, testApp, testDb } from './helpers.js';

const { db, pool } = testDb();
let app: FastifyInstance;

// Resetting the accounts also empties the rooms (they reference their host), so each test gets
// its own: an open peer room, a peer room in a high-sensitivity community, and a guided room
// that is never open (its session lasts 0 minutes).
beforeEach(async () => {
  await resetDb(db);
  await db.insert(rooms).values([
    { id: 'open-room', kind: 'peer', communityId: 'anxiety' },
    { id: 'high-room', kind: 'peer', communityId: 'depression' },
    { id: 'guided-room', kind: 'guided', communityId: 'grief', scheduleDay: 0, scheduleTime: '19:00', durationMin: 0 }
  ]);
  ({ app } = await testApp(db));
});
afterEach(() => app.close());
afterAll(() => pool.end());

type Client = ReturnType<typeof client>;

async function member(nickname: string, role?: 'therapist' | 'moderator'): Promise<Client> {
  const c = client(app);
  const res = await c.post('/auth/signup', signUpBody({ nickname, communities: ['anxiety'] }));
  expect(res.statusCode, res.body).toBe(201);
  if (role) await db.update(accounts).set({ role, therapistKind: role === 'therapist' ? 'psychologist' : null }).where(eq(accounts.nicknameKey, nickname));
  return c;
}

async function say(c: Client, text: string, room = 'open-room') {
  const res = await c.post(`/rooms/${room}/messages`, { text });
  expect(res.statusCode, res.body).toBe(201);
  return res.json().message as { id: string; held?: true; mine?: true };
}

const messagesOf = async (c: Client, room = 'open-room') => (await c.get(`/rooms/${room}`)).json().messages as { id: string; text: string; authorNickname: string; held?: true; mine?: true; therapist?: string }[];

describe('opening hours', () => {
  const guided = { kind: 'guided' as const, scheduleDay: 4, scheduleTime: '20:00', durationMin: 60 };

  it('peer rooms are always open', () => {
    expect(isOpen({ kind: 'peer', scheduleDay: null, scheduleTime: null, durationMin: 60 })).toBe(true);
  });

  it('guided rooms are open during their weekly session, in Algiers time (UTC+1)', () => {
    // Thursday 22 October 2026.
    expect(isOpen(guided, new Date('2026-10-22T18:59:00Z'))).toBe(false); // 19:59 in Algiers
    expect(isOpen(guided, new Date('2026-10-22T19:00:00Z'))).toBe(true); // 20:00
    expect(isOpen(guided, new Date('2026-10-22T19:59:00Z'))).toBe(true); // 20:59
    expect(isOpen(guided, new Date('2026-10-22T20:00:00Z'))).toBe(false); // 21:00
    expect(isOpen(guided, new Date('2026-10-29T19:30:00Z'))).toBe(true); // a week later
    expect(isOpen(guided, new Date('2026-10-23T19:30:00Z'))).toBe(false); // the next day
  });

  it('a late Saturday session runs past midnight into Sunday', () => {
    const late = { ...guided, scheduleDay: 6, scheduleTime: '23:30' };
    expect(isOpen(late, new Date('2026-10-24T22:45:00Z'))).toBe(true); // Saturday 23:45
    expect(isOpen(late, new Date('2026-10-24T23:15:00Z'))).toBe(true); // Sunday 00:15
    expect(isOpen(late, new Date('2026-10-24T23:31:00Z'))).toBe(false); // Sunday 00:31
  });

  it('a guided room without a schedule stays closed', () => {
    expect(isOpen({ ...guided, scheduleDay: null })).toBe(false);
  });
});

describe('rooms', () => {
  it('lists rooms with their schedule and whether they are live', async () => {
    const list = (await client(app).get('/rooms')).json().rooms as { id: string; live: boolean; schedule: unknown; present: number }[];
    expect(list.map((r) => r.id).sort()).toEqual(['guided-room', 'high-room', 'open-room']);
    expect(list.find((r) => r.id === 'open-room')).toMatchObject({ live: true, schedule: null, present: 0 });
    expect(list.find((r) => r.id === 'guided-room')).toMatchObject({ live: false, schedule: { day: 0, time: '19:00' } });
    expect((await client(app).get('/rooms/nope')).statusCode).toBe(404);
  });

  it('guests read; members write; everyone sees published messages', async () => {
    const a = await member('amal_dawn');
    const guest = client(app);
    expect((await guest.post('/rooms/open-room/messages', { text: 'hello' })).statusCode).toBe(401);

    const sent = await say(a, '  Good evening, everyone.  ');
    expect(sent).toMatchObject({ mine: true });
    expect(sent.held).toBeUndefined();
    const seen = await messagesOf(guest);
    expect(seen).toEqual([expect.objectContaining({ id: sent.id, text: 'Good evening, everyone.', authorNickname: 'amal_dawn' })]);
    expect(seen[0]!.mine).toBeUndefined();
  });

  it('refuses empty and over-long messages', async () => {
    const a = await member('amal_dawn');
    expect((await a.post('/rooms/open-room/messages', { text: '   ' })).statusCode).toBe(400);
    expect((await a.post('/rooms/open-room/messages', { text: 'x'.repeat(1_001) })).statusCode).toBe(400);
  });

  it('counts signed-in members who have the room open, never guests', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    await client(app).get('/rooms/open-room');
    await a.get('/rooms/open-room');
    const res = (await b.get('/rooms/open-room')).json();
    expect(res.room.present).toBe(2);
    expect(JSON.stringify(res.room)).not.toContain('amal_dawn');
  });

  it('closed guided rooms take no messages, except from their host', async () => {
    const a = await member('amal_dawn');
    const huda = await member('huda_t', 'therapist');
    expect((await a.post('/rooms/guided-room/messages', { text: 'hello?' })).statusCode).toBe(409);

    const [h] = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.nicknameKey, 'huda_t'));
    await db.update(rooms).set({ hostId: h!.id }).where(eq(rooms.id, 'guided-room'));
    await say(huda, 'See you all on Sunday.', 'guided-room');
    expect((await messagesOf(a, 'guided-room'))[0]).toMatchObject({ authorNickname: 'huda_t', therapist: 'psychologist' });
  });

  it('holds messages with identifying details, and everything in high-sensitivity rooms; staff are never held', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const huda = await member('huda_t', 'therapist');
    const phone = await say(a, 'Call me on 0555 12 34 56');
    expect(phone.held).toBe(true);
    expect((await messagesOf(a)).map((m) => m.id)).toContain(phone.id);
    expect((await messagesOf(b)).map((m) => m.id)).not.toContain(phone.id);

    expect((await say(a, 'Small win: I ate breakfast.', 'high-room')).held).toBe(true);
    expect((await say(huda, 'Well done, everyone.', 'high-room')).held).toBeUndefined();
  });

  it('hides authors a member blocked', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    await say(b, 'hello from sea_glass');
    expect((await a.put('/me/blocks/sea_glass')).statusCode).toBe(204);
    expect(await messagesOf(a)).toEqual([]);
  });

  it('authors delete their messages; moderators remove; nobody else can', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const mod = await member('mod_noor', 'moderator');
    const one = await say(a, 'first');
    const two = await say(a, 'second');
    expect((await b.del(`/room-messages/${one.id}`)).statusCode).toBe(404);
    expect((await a.del(`/room-messages/${one.id}`)).statusCode).toBe(204);
    expect((await mod.del(`/room-messages/${two.id}`)).statusCode).toBe(204);
    expect(await messagesOf(b)).toEqual([]);
  });

  it('reports a message (optionally blocking its author); moderators see it and decide held ones', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const mod = await member('mod_noor', 'moderator');
    const rude = await say(b, 'something unkind');
    const res = await a.post('/reports', { roomMessageId: rude.id, reason: 'harassment', block: true });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().blocked).toBe(true);
    expect(await messagesOf(a)).toEqual([]);

    const reports = (await mod.get('/moderation/reports')).json().reports;
    expect(reports[0].target).toMatchObject({ type: 'message', id: rude.id, roomId: 'open-room', authorNickname: 'sea_glass' });
    expect((await a.post('/reports', { roomMessageId: rude.id, replyId: 'r1', reason: 'spam' })).statusCode).toBe(400);

    const held = await say(b, 'my insta is sea.glass');
    const queue = (await mod.get('/moderation/queue')).json();
    expect(queue.messages).toEqual([expect.objectContaining({ id: held.id, roomId: 'open-room', heldReasons: ['social'] })]);
    expect((await a.post(`/moderation/room-messages/${held.id}`, { action: 'approve' })).statusCode).toBe(403);
    expect((await mod.post(`/moderation/room-messages/${held.id}`, { action: 'approve' })).statusCode).toBe(204);
    expect((await messagesOf(client(app))).map((m) => m.id)).toContain(held.id);
  });
});
