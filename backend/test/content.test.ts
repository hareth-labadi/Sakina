import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accounts, stories } from '../src/db/schema.js';
import { client, PASSWORD, resetDb, signUpBody, testApp, testDb, WEB } from './helpers.js';

const { db, pool } = testDb();
let app: FastifyInstance;

beforeEach(async () => {
  await resetDb(db);
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

const story = (over: Record<string, unknown> = {}) => ({
  communityId: 'anxiety',
  type: 'story',
  title: 'Tuesday mornings',
  body: 'My heart races before I open my eyes.\n\nWriting it down helps some weeks.',
  visibility: 'public',
  ...over
});

async function post(c: Client, over: Record<string, unknown> = {}) {
  const res = await c.post('/stories', story(over));
  expect(res.statusCode, res.body).toBe(201);
  return res.json().story as { id: string; status?: 'held' };
}

const guest = () => client(app);

describe('communities', () => {
  it('lists the active ones with live member and story counts', async () => {
    const a = await member('amal_dawn');
    await post(a);
    const list = (await guest().get('/communities')).json().communities as { id: string; memberCount: number; storyCount: number }[];
    expect(list).toHaveLength(12);
    expect(list.find((c) => c.id === 'anxiety')).toMatchObject({ memberCount: 1, storyCount: 1, sensitivity: 'standard' });
  });

  it('memberships refuse unknown communities', async () => {
    const a = await member('amal_dawn');
    expect((await a.put('/me/communities/not-a-community')).statusCode).toBe(404);
    expect((await a.post('/auth/signup', signUpBody({ nickname: 'other_one', communities: ['nope'] }))).statusCode).toBe(400);
  });
});

describe('posting', () => {
  it('publishes ordinary stories; they appear in feeds with a computed excerpt', async () => {
    const a = await member('amal_dawn');
    const s = await post(a);
    expect(s.status).toBeUndefined();
    const feed = (await guest().get('/stories?community=anxiety')).json();
    expect(feed.stories).toHaveLength(1);
    expect(feed.stories[0]).toMatchObject({ id: s.id, authorNickname: 'amal_dawn', excerpt: 'My heart races before I open my eyes.', reactionTotal: 0, veil: null });
    expect((await guest().get('/stories?community=panic')).json().stories).toHaveLength(0);
  });

  it('holds identifying details and high-sensitivity communities; only the author sees held posts', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const phone = await post(a, { body: 'Call me on 0555 12 34 56' });
    const high = await post(a, { communityId: 'depression' });
    expect(phone.status).toBe('held');
    expect(high.status).toBe('held');

    expect((await a.get(`/stories/${phone.id}`)).json()).toMatchObject({ status: 'held' });
    expect((await b.get(`/stories/${phone.id}`)).statusCode).toBe(404);
    expect((await guest().get(`/stories/${high.id}`)).statusCode).toBe(404);
    expect((await b.get('/stories')).json().stories).toHaveLength(0);
    expect((await a.get('/stories')).json().stories).toHaveLength(2);

    const n = (await a.get('/me/notifications')).json();
    expect(n.notifications.map((x: { kind: string }) => x.kind)).toEqual(['held', 'held']);
  });

  it('validates input, needs a session and the site origin', async () => {
    const a = await member('amal_dawn');
    for (const over of [{ communityId: 'nope' }, { title: 'ab' }, { body: '   ' }, { type: 'poem' }, { veil: ['ghosts'] }, { visibility: 'secret' }]) {
      expect((await a.post('/stories', story(over))).statusCode, JSON.stringify(over)).toBe(400);
    }
    expect((await guest().post('/stories', story())).statusCode).toBe(401);
    const foreign = await app.inject({ method: 'POST', url: '/stories', payload: story(), headers: { origin: 'https://evil.example', cookie: a.cookie! } });
    expect(foreign.statusCode).toBe(403);
  });

  it('limits each account to 5 stories a day', async () => {
    const a = await member('amal_dawn');
    for (let i = 0; i < 5; i++) await post(a);
    const sixth = await a.post('/stories', story());
    expect(sixth.statusCode).toBe(429);
    expect(sixth.json()).toEqual({ error: 'post_limit' });
  });

  it('pages through a feed, newest first', async () => {
    const a = await member('amal_dawn');
    const ids = [];
    for (let i = 0; i < 5; i++) ids.push((await post(a, { title: `Story number ${i}` })).id);
    const first = (await guest().get('/stories?limit=2')).json();
    const second = (await guest().get(`/stories?limit=2&before=${first.next}`)).json();
    const third = (await guest().get(`/stories?limit=2&before=${second.next}`)).json();
    expect([...first.stories, ...second.stories, ...third.stories].map((s: { id: string }) => s.id)).toEqual(ids.reverse());
    expect(third.next).toBeNull();
  });
});

describe('members-only stories', () => {
  it('guests get the title but not the text', async () => {
    const a = await member('amal_dawn');
    const s = await post(a, { visibility: 'members' });
    const inFeed = (await guest().get('/stories')).json().stories[0];
    expect(inFeed).toMatchObject({ title: 'Tuesday mornings', excerpt: '', visibility: 'members' });
    const page = (await guest().get(`/stories/${s.id}`)).json();
    expect(page).toMatchObject({ locked: true, body: '', replies: [] });
    const b = await member('sea_glass');
    expect((await b.get(`/stories/${s.id}`)).json().body).toContain('My heart races');
  });
});

describe('reactions', () => {
  it('toggle per kind, count, and notify the author once per new reaction (grouped)', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const c = await member('blue_hour');
    const s = await post(a);

    expect((await b.put(`/stories/${s.id}/reactions/relate`)).json()).toMatchObject({ reactions: { relate: 1, strength: 0 }, mine: ['relate'] });
    await b.put(`/stories/${s.id}/reactions/relate`); // idempotent
    await b.put(`/stories/${s.id}/reactions/thanks`);
    await c.put(`/stories/${s.id}/reactions/relate`);
    await a.put(`/stories/${s.id}/reactions/strength`); // own reaction: no notification
    expect((await b.del(`/stories/${s.id}/reactions/thanks`)).json()).toMatchObject({ reactions: { relate: 2, thanks: 0, strength: 1 }, mine: ['relate'] });

    const page = (await b.get(`/stories/${s.id}`)).json();
    expect(page.viewer).toEqual({ reactions: ['relate'], saved: false, isAuthor: false });
    expect((await guest().get('/stories')).json().stories[0].reactionTotal).toBe(3);

    const n = (await a.get('/me/notifications')).json();
    expect(n.notifications).toHaveLength(1);
    expect(n.notifications[0]).toMatchObject({ kind: 'reaction', count: 3, storyId: s.id, storyTitle: 'Tuesday mornings', read: false });
    expect(n.unread).toBe(1);
    expect((await a.get('/auth/me')).json().user.unreadNotifications).toBe(1);

    expect((await guest().put(`/stories/${s.id}/reactions/relate`)).statusCode).toBe(401);
    expect((await b.put(`/stories/${s.id}/reactions/love`)).statusCode).toBe(400);
  });
});

describe('replies', () => {
  it('threads one level deep and notifies the right people', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const c = await member('blue_hour');
    const s = await post(a);

    const r1 = (await b.post(`/stories/${s.id}/replies`, { text: 'Tuesday mornings. Same.' })).json().reply;
    expect(r1).toMatchObject({ authorNickname: 'sea_glass', relateCount: 0, mine: true });
    const r2 = await c.post(`/stories/${s.id}/replies`, { text: 'Writing helps me too.', parentId: r1.id });
    expect(r2.statusCode).toBe(201);
    // Only one level: answering a child is refused.
    expect((await a.post(`/stories/${s.id}/replies`, { text: 'x', parentId: r2.json().reply.id })).json()).toEqual({ error: 'invalid_parent' });

    const tree = (await guest().get(`/stories/${s.id}`)).json().replies;
    expect(tree).toHaveLength(1);
    expect(tree[0].replies).toHaveLength(1);
    expect(tree[0].replies[0]).toMatchObject({ authorNickname: 'blue_hour', text: 'Writing helps me too.' });

    const forA = (await a.get('/me/notifications')).json().notifications;
    expect(forA.map((n: { kind: string; actor?: string }) => [n.kind, n.actor])).toEqual([
      ['reply', 'blue_hour'],
      ['reply', 'sea_glass']
    ]);
    const forB = (await b.get('/me/notifications')).json().notifications;
    expect(forB.map((n: { kind: string; actor?: string }) => [n.kind, n.actor])).toEqual([['reply', 'blue_hour']]);
  });

  it('marks therapist replies and notifies with "therapist"', async () => {
    const a = await member('amal_dawn');
    const t = await member('huda', 'therapist');
    const s = await post(a, { communityId: 'anxiety' });
    await t.post(`/stories/${s.id}/replies`, { text: 'Naming the feeling is a real skill.' });
    expect((await guest().get(`/stories/${s.id}`)).json().replies[0]).toMatchObject({ therapist: 'psychologist' });
    expect((await a.get('/me/notifications')).json().notifications[0]).toMatchObject({ kind: 'therapist', actor: 'huda' });
  });

  it('holds replies with identifying details; only their author sees them', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const s = await post(a);
    const held = (await b.post(`/stories/${s.id}/replies`, { text: 'add me on insta' })).json().reply;
    expect(held.held).toBe(true);
    expect((await b.get(`/stories/${s.id}`)).json().replies).toHaveLength(1);
    expect((await a.get(`/stories/${s.id}`)).json().replies).toHaveLength(0);
    // The story's author isn't notified of a held reply.
    expect((await a.get('/me/notifications')).json().notifications).toHaveLength(0);
  });

  it('"I relate" toggles with a count', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const s = await post(a);
    const r = (await b.post(`/stories/${s.id}/replies`, { text: 'Same here.' })).json().reply;
    expect((await a.put(`/replies/${r.id}/relate`)).json()).toEqual({ relateCount: 1, related: true });
    expect((await a.get(`/stories/${s.id}`)).json().replies[0]).toMatchObject({ relateCount: 1, related: true });
    expect((await a.del(`/replies/${r.id}/relate`)).json()).toEqual({ relateCount: 0, related: false });
  });

  it('authors delete their own replies; others cannot', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const s = await post(a);
    const r = (await b.post(`/stories/${s.id}/replies`, { text: 'Same here.' })).json().reply;
    expect((await a.del(`/replies/${r.id}`)).statusCode).toBe(404);
    expect((await b.del(`/replies/${r.id}`)).statusCode).toBe(204);
    expect((await a.get(`/stories/${s.id}`)).json().replies).toHaveLength(0);
  });
});

describe('saved stories', () => {
  it('saves privately, lists newest first, and drops what disappears', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const s1 = await post(a, { title: 'First story' });
    const s2 = await post(a, { title: 'Second story' });
    expect((await b.put(`/me/saved/${s1.id}`)).statusCode).toBe(204);
    expect((await b.put(`/me/saved/${s2.id}`)).statusCode).toBe(204);
    expect((await b.get('/me/saved')).json().stories.map((s: { id: string }) => s.id)).toEqual([s2.id, s1.id]);
    expect((await b.get(`/stories/${s1.id}`)).json().viewer.saved).toBe(true);
    expect((await a.get('/me/saved')).json().stories).toHaveLength(0);

    await a.del(`/stories/${s2.id}`);
    expect((await b.get('/me/saved')).json().stories.map((s: { id: string }) => s.id)).toEqual([s1.id]);
    expect((await b.del(`/me/saved/${s1.id}`)).statusCode).toBe(204);
    expect((await b.get('/me/saved')).json().stories).toHaveLength(0);
    expect((await b.put('/me/saved/doesnotexist')).statusCode).toBe(404);
  });
});

describe('notifications', () => {
  it('mark one or all as read', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const s = await post(a);
    await b.post(`/stories/${s.id}/replies`, { text: 'One.' });
    await b.post(`/stories/${s.id}/replies`, { text: 'Two.' });
    const list = (await a.get('/me/notifications')).json();
    expect(list.unread).toBe(2);
    expect((await a.post('/me/notifications/read', { id: list.notifications[0].id })).json()).toEqual({ unread: 1 });
    expect((await a.post('/me/notifications/read', {})).json()).toEqual({ unread: 0 });
    expect((await a.get('/me/notifications')).json().notifications.every((n: { read: boolean }) => n.read)).toBe(true);
  });
});

describe('reports and blocks', () => {
  it('reports anonymously, and blocking hides the author everywhere for the blocker', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const mod = await member('mod_noor', 'moderator');
    const s = await post(a);
    const r = (await a.post(`/stories/${s.id}/replies`, { text: 'Thanks for reading.' })).json().reply;

    expect((await b.post('/reports', { replyId: r.id, reason: 'spam' })).statusCode).toBe(201);
    expect((await b.post('/reports', { storyId: s.id, reason: 'harassment', note: 'not ok', block: true })).json()).toEqual({ blocked: true });
    // Once blocked, amal's content is gone for sea_glass, so it can't be reported again either.
    expect((await b.post('/reports', { replyId: r.id, reason: 'spam' })).statusCode).toBe(404);
    expect((await b.post('/reports', { storyId: s.id, replyId: r.id, reason: 'spam' })).statusCode).toBe(400);
    expect((await b.post('/reports', { reason: 'spam' })).statusCode).toBe(400);

    expect((await b.get('/stories')).json().stories).toHaveLength(0);
    expect((await b.get(`/stories/${s.id}`)).statusCode).toBe(404);
    expect((await b.get('/me/blocks')).json()).toEqual({ nicknames: ['amal_dawn'] });
    // amal_dawn's replies to blocked people don't notify them either, and amal isn't told.
    expect((await guest().get('/stories')).json().stories).toHaveLength(1);

    const open = (await mod.get('/moderation/reports')).json().reports;
    expect(open).toHaveLength(2);
    expect(JSON.stringify(open)).not.toContain('sea_glass'); // the reporter stays anonymous
    expect(open.find((x: { reason: string }) => x.reason === 'harassment')).toMatchObject({ note: 'not ok', target: { type: 'story', id: s.id, authorNickname: 'amal_dawn' } });
    expect((await mod.post(`/moderation/reports/${open[0].id}/resolve`, {})).statusCode).toBe(204);
    expect((await mod.get('/moderation/reports')).json().reports).toHaveLength(1);

    expect((await b.del('/me/blocks/amal_dawn')).statusCode).toBe(204);
    expect((await b.get('/stories')).json().stories).toHaveLength(1);
  });
});

describe('moderation', () => {
  it('is for moderators only', async () => {
    const a = await member('amal_dawn');
    expect((await a.get('/moderation/queue')).statusCode).toBe(403);
    expect((await guest().get('/moderation/queue')).statusCode).toBe(401);
  });

  it('approves held content (and tells the author) or removes it', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const mod = await member('mod_noor', 'moderator');
    const held = await post(a, { communityId: 'depression' });
    const okStory = await post(a);
    const heldReply = (await b.post(`/stories/${okStory.id}/replies`, { text: 'my number is 0555 12 34 56' })).json().reply;

    const queue = (await mod.get('/moderation/queue')).json();
    expect(queue.stories).toEqual([expect.objectContaining({ id: held.id, heldReasons: ['sensitive_community'], authorNickname: 'amal_dawn' })]);
    expect(queue.replies).toEqual([expect.objectContaining({ id: heldReply.id, heldReasons: ['phone'], storyTitle: 'Tuesday mornings' })]);

    expect((await mod.post(`/moderation/stories/${held.id}`, { action: 'approve' })).statusCode).toBe(204);
    expect((await guest().get(`/stories/${held.id}`)).statusCode).toBe(200);
    expect((await a.get('/me/notifications')).json().notifications.map((n: { kind: string }) => n.kind)).toContain('approved');

    expect((await mod.post(`/moderation/replies/${heldReply.id}`, { action: 'remove' })).statusCode).toBe(204);
    expect((await b.get(`/stories/${okStory.id}`)).json().replies).toHaveLength(0);
    expect((await mod.post(`/moderation/replies/${heldReply.id}`, { action: 'approve' })).statusCode).toBe(404);
    expect((await mod.post(`/moderation/stories/${held.id}`, { action: 'explode' })).statusCode).toBe(400);
    expect((await mod.get('/moderation/queue')).json()).toEqual({ stories: [], replies: [], messages: [] });
  });

  it('moderators remove published stories; authors delete theirs; nobody else can', async () => {
    const a = await member('amal_dawn');
    const b = await member('sea_glass');
    const mod = await member('mod_noor', 'moderator');
    const s1 = await post(a);
    const s2 = await post(a);
    expect((await b.del(`/stories/${s1.id}`)).statusCode).toBe(404);
    expect((await mod.del(`/stories/${s1.id}`)).statusCode).toBe(204);
    expect((await guest().get(`/stories/${s1.id}`)).statusCode).toBe(404);
    expect((await db.select().from(stories).where(eq(stories.id, s1.id)))[0]?.status).toBe('removed');
    expect((await a.del(`/stories/${s2.id}`)).statusCode).toBe(204);
    expect(await db.select().from(stories).where(eq(stories.id, s2.id))).toHaveLength(0);
  });
});

describe('sample-content authors', () => {
  it('are locked: their placeholder hash never matches', async () => {
    await db.insert(accounts).values({ nickname: 'quiet_river', nicknameKey: 'quiet_river', passwordHash: '!locked', avatar: 0 });
    for (const password of [PASSWORD, '!locked', '']) {
      const res = await app.inject({ method: 'POST', url: '/auth/signin', payload: { nickname: 'quiet_river', password }, headers: { origin: WEB } });
      expect(res.statusCode).not.toBe(200);
    }
  });
});
