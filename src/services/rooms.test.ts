import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@/types/domain';
import { rooms } from './rooms';

/** A fake API: answers each call with the next queued response and records what was sent. */
function fakeApi() {
  const calls: { url: string; method: string; body?: unknown }[] = [];
  const queue: { status: number; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined });
      const next = queue.shift() ?? { status: 200, body: {} };
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

const room = (id: string): Room => ({ id, kind: 'peer', communityId: 'loneliness', host: null, schedule: null, live: true, present: 3 });

describe('rooms', () => {
  it('adds the UI copy and leaves out rooms that have none', async () => {
    fake.answer(200, { rooms: [room('night-owls'), room('not-in-the-copy')] });
    const list = await rooms.list();
    expect(list.map((r) => r.id)).toEqual(['night-owls']);
    expect(list[0]!.title.en).toBe('Night owls');
  });

  it('gets a room with its messages, or null', async () => {
    fake.answer(200, { room: room('night-owls'), messages: [{ id: 'n1', authorNickname: 'moon_tea', authorAvatar: 1, text: 'hi', createdAt: '2026-10-27T00:12:00Z' }] });
    expect((await rooms.get('night-owls'))?.messages).toHaveLength(1);
    fake.answer(404, { error: 'not_found' });
    expect(await rooms.get('nope')).toBeNull();
    expect(fake.calls.map((c) => c.url)).toEqual(['http://localhost:4000/rooms/night-owls', 'http://localhost:4000/rooms/nope']);
  });

  it('sends a message and turns refusals into results', async () => {
    fake.answer(201, { message: { id: 'x1', authorNickname: 'amal_dawn', authorAvatar: 2, text: 'hello', createdAt: '2026-10-28T10:00:00Z', mine: true } });
    expect(await rooms.send('night-owls', 'hello')).toMatchObject({ ok: true, message: { id: 'x1' } });
    expect(fake.calls[0]).toMatchObject({ method: 'POST', url: 'http://localhost:4000/rooms/night-owls/messages', body: { text: 'hello' } });

    fake.answer(409, { error: 'closed' });
    expect(await rooms.send('grounding', 'hi')).toEqual({ ok: false, error: 'closed' });
    fake.answer(429, { error: 'post_limit' });
    expect(await rooms.send('grounding', 'hi')).toEqual({ ok: false, error: 'post_limit' });
    fake.answer(400, { error: 'invalid' });
    expect(await rooms.send('grounding', '')).toEqual({ ok: false, error: 'invalid' });
  });

  it('deletes and blocks', async () => {
    fake.answer(204);
    fake.answer(204);
    expect(await rooms.remove('x1')).toBe(true);
    expect(await rooms.block('moon tea')).toBe(true);
    expect(fake.calls.map((c) => `${c.method} ${c.url}`)).toEqual(['DELETE http://localhost:4000/room-messages/x1', 'PUT http://localhost:4000/me/blocks/moon%20tea']);
  });
});
