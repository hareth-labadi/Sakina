import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { moderation } from './moderation';

let calls: { url: string; method: string; body?: unknown }[];
let answers: { status: number; body?: unknown }[];

beforeEach(() => {
  calls = [];
  answers = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body as string) : undefined });
      const a = answers.shift() ?? { status: 200, body: {} };
      return new Response(a.body === undefined ? null : JSON.stringify(a.body), { status: a.status });
    })
  );
});
afterEach(() => vi.unstubAllGlobals());

const answer = (status: number, body?: unknown) => answers.push({ status, body });

describe('moderation service', () => {
  it('decides on held stories and replies', async () => {
    answer(204);
    expect(await moderation.decide('story', 's1', 'approve')).toBe(true);
    answer(404, { error: 'not_found' }); // someone else decided first
    expect(await moderation.decide('reply', 'r/1', 'remove')).toBe(false);
    expect(calls).toEqual([
      { url: 'http://localhost:4000/moderation/stories/s1', method: 'POST', body: { action: 'approve' } },
      { url: 'http://localhost:4000/moderation/replies/r%2F1', method: 'POST', body: { action: 'remove' } }
    ]);
  });

  it('lists the queue and reports, and refuses quietly when not a moderator', async () => {
    answer(200, { stories: [{ id: 's1' }], replies: [] });
    expect(await moderation.queue()).toEqual({ stories: [{ id: 's1' }], replies: [] });
    answer(200, { reports: [{ id: 'x' }] });
    expect(await moderation.reports()).toEqual([{ id: 'x' }]);
    answer(403, { error: 'forbidden' });
    await expect(moderation.queue()).rejects.toMatchObject({ status: 403 });
  });

  it('removes published content with DELETE and resolves reports', async () => {
    answer(204);
    expect(await moderation.removeContent('reply', 'r1')).toBe(true);
    answer(204);
    expect(await moderation.resolve('rep-1')).toBe(true);
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'DELETE http://localhost:4000/replies/r1',
      'POST http://localhost:4000/moderation/reports/rep-1/resolve'
    ]);
  });
});
