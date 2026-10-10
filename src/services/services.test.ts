import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NewStory } from '@/types/domain';
import { api, apiBase, ApiError, request } from './api';
import * as auth from './auth';
import { communityStats, stories } from './index';
import { notifications } from './notifications';
import { addReply, report, savedStories, setReaction, storyPages } from './reading';

/** A fake API: answers each call with the next queued response and records what was sent. */
function fakeApi() {
  const calls: { url: string; method: string; body?: unknown; cache?: string; credentials?: string }[] = [];
  const queue: { status: number; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined, cache: init.cache, credentials: init.credentials });
      const next = queue.shift() ?? { status: 200, body: {} };
      // A 204 can't carry a body, not even an empty one.
      return new Response(next.body === undefined ? null : JSON.stringify(next.body), { status: next.status });
    })
  );
  return { calls, answer: (status: number, body?: unknown) => queue.push({ status, body }) };
}

let fake: ReturnType<typeof fakeApi>;
beforeEach(() => {
  fake = fakeApi();
});
afterEach(() => vi.unstubAllGlobals());

describe('api wrapper', () => {
  it('goes straight to the API on the server, through /api in the browser', () => {
    expect(apiBase()).toBe('http://localhost:4000');
    vi.stubEnv('API_INTERNAL_URL', 'http://api:4000');
    expect(apiBase()).toBe('http://api:4000');
    vi.stubGlobal('window', {});
    expect(apiBase()).toBe('/api');
  });

  it('sends JSON, never caches, returns 4xx as data and throws on 5xx', async () => {
    fake.answer(401, { error: 'invalid' });
    expect(await request('/x', { body: { a: 1 } })).toEqual({ status: 401, data: { error: 'invalid' } });
    expect(fake.calls[0]).toMatchObject({ method: 'POST', body: { a: 1 }, cache: 'no-store', credentials: 'same-origin' });

    fake.answer(204);
    expect(await request('/x', { method: 'DELETE' })).toEqual({ status: 204, data: null });

    fake.answer(503);
    await expect(request('/x')).rejects.toBeInstanceOf(ApiError);
    fake.answer(404, { error: 'not_found' });
    await expect(api('/x')).rejects.toMatchObject({ status: 404 });
  });
});

describe('auth service', () => {
  it('maps every sign-in outcome', async () => {
    const user = { nickname: 'amal_dawn', avatar: 2, role: 'member', unreadNotifications: 0 };
    fake.answer(200, { user });
    expect(await auth.signIn('amal_dawn', 'pw', false)).toEqual({ ok: true, user });
    expect(fake.calls[0]).toMatchObject({ url: 'http://localhost:4000/auth/signin', body: { nickname: 'amal_dawn', password: 'pw', remember: false } });

    fake.answer(401, { error: 'invalid', attemptsLeft: 3 });
    expect(await auth.signIn('a', 'b', true)).toEqual({ ok: false, error: 'invalid', attemptsLeft: 3 });
    fake.answer(423, { error: 'locked', until: 123 });
    expect(await auth.signIn('a', 'b', true)).toEqual({ ok: false, error: 'locked', until: 123 });
    fake.answer(403, { error: 'suspended', reason: 'spam' });
    expect(await auth.signIn('a', 'b', true)).toEqual({ ok: false, error: 'suspended', reason: 'spam' });
    fake.answer(429, { error: 'rate_limited' });
    await expect(auth.signIn('a', 'b', true)).rejects.toBeInstanceOf(ApiError);
  });

  it('maps sign-up, the session and recovery', async () => {
    fake.answer(409, { error: 'nickname_taken' });
    const input: auth.SignUpInput = { nickname: 'x', password: 'p', avatar: 0, communities: ['anxiety'], ageRange: null, country: null, recovery: { type: 'code', code: 'K7QM-4XPT-9HDA' }, locale: 'en' };
    expect(await auth.signUp(input)).toEqual({ ok: false, error: 'nickname_taken' });
    fake.answer(400, { error: 'weak_password' });
    expect(await auth.signUp(input)).toEqual({ ok: false, error: 'invalid' });

    fake.answer(200, { user: null });
    expect(await auth.me()).toBeNull();
    fake.answer(423, { error: 'locked', until: 1 });
    expect(await auth.verifyRecoveryCode('a', 'b')).toEqual({ ok: false, locked: true });
    fake.answer(400, { error: 'weak_password' });
    expect(await auth.resetPassword('t', 'p')).toEqual({ ok: false, error: 'weak_password' });
    fake.answer(200, { available: false, reason: 'taken', suggestions: ['amal_2'] });
    expect(await auth.checkNickname('Amal Dawn')).toMatchObject({ available: false });
    expect(fake.calls.at(-1)!.url).toContain('nickname=Amal%20Dawn');
  });
});

describe('stories service', () => {
  it('asks for the right feeds and falls back to empty', async () => {
    fake.answer(200, { stories: [{ id: 's1' }], next: null });
    expect(await stories.featured()).toEqual([{ id: 's1' }]);
    expect(fake.calls[0]!.url).toBe('http://localhost:4000/stories?limit=3');

    fake.answer(200, { stories: [], next: 'abc' });
    await stories.byCommunity('grief', 'c/1');
    expect(fake.calls[1]!.url).toBe('http://localhost:4000/stories?community=grief&limit=20&before=c%2F1');

    fake.answer(400, { error: 'invalid' });
    expect(await stories.featured()).toEqual([]);
  });

  it('maps posting outcomes', async () => {
    const story: NewStory = { communityId: 'anxiety', type: 'story', title: 'Title', body: 'Body', visibility: 'public', veil: [] };
    fake.answer(201, { story: { id: 'n1', status: 'held' } });
    expect(await stories.create(story)).toEqual({ ok: true, story: { id: 'n1', status: 'held' } });
    fake.answer(429, { error: 'post_limit' });
    expect(await stories.create(story)).toEqual({ ok: false, error: 'post_limit' });
    fake.answer(400, { error: 'unknown_community' });
    expect(await stories.create(story)).toEqual({ ok: false, error: 'unknown_community' });
    fake.answer(401, { error: 'unauthenticated' });
    expect(await stories.create(story)).toEqual({ ok: false, error: 'invalid' });
  });

  it('turns community numbers into a map', async () => {
    fake.answer(200, { communities: [{ id: 'anxiety', memberCount: 3, storyCount: 2 }] });
    expect(await communityStats()).toEqual({ anxiety: { id: 'anxiety', memberCount: 3, storyCount: 2 } });
  });
});

describe('reading service', () => {
  it('a story the viewer may not see is null', async () => {
    fake.answer(404, { error: 'not_found' });
    expect(await storyPages.get('s1')).toBeNull();
  });

  it('reactions, replies, saving and reports call the right routes', async () => {
    fake.answer(200, { reactions: { relate: 1 }, mine: ['relate'] });
    await setReaction('s1', 'relate', true);
    fake.answer(200, { reactions: { relate: 0 }, mine: [] });
    await setReaction('s1', 'relate', false);
    expect(fake.calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'PUT http://localhost:4000/stories/s1/reactions/relate',
      'DELETE http://localhost:4000/stories/s1/reactions/relate'
    ]);

    fake.answer(429, { error: 'post_limit' });
    expect(await addReply('s1', 'hi')).toEqual({ ok: false, error: 'post_limit' });
    fake.answer(201, { reply: { id: 'r9', held: true } });
    expect(await addReply('s1', 'hi', 'r1')).toEqual({ ok: true, reply: { id: 'r9', held: true } });
    expect(fake.calls.at(-1)!.body).toEqual({ text: 'hi', parentId: 'r1' });

    fake.answer(204);
    expect(await savedStories.setSaved('s1', true)).toEqual({ ok: true });
    fake.answer(201, { blocked: true });
    expect(await report({ replyId: 'r1' }, { reason: 'spam', note: '', block: true })).toEqual({ ok: true, blocked: true });
    expect(fake.calls.at(-1)!.body).toEqual({ replyId: 'r1', reason: 'spam', note: '', block: true });
  });

  it('notifications list and mark read', async () => {
    fake.answer(200, { notifications: [], unread: 0 });
    expect(await notifications.list()).toEqual({ notifications: [], unread: 0 });
    fake.answer(200, { unread: 2 });
    expect(await notifications.markRead('n1')).toBe(2);
    expect(fake.calls.at(-1)!.body).toEqual({ id: 'n1' });
  });
});
