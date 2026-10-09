import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { client, resetDb, signUpBody, testApp, testDb, WEB } from './helpers.js';

const { db, pool } = testDb();
let app: FastifyInstance;

beforeEach(async () => {
  await resetDb(db);
  ({ app } = await testApp(db));
});
afterEach(() => app.close());
afterAll(() => pool.end());

async function member(over: Record<string, unknown> = {}) {
  const c = client(app);
  expect((await c.post('/auth/signup', signUpBody(over))).statusCode).toBe(201);
  return c;
}

const put = (c: ReturnType<typeof client>, url: string) =>
  app.inject({ method: 'PUT', url, headers: { origin: WEB, ...(c.cookie && { cookie: c.cookie }) } });
const del = (c: ReturnType<typeof client>, url: string) =>
  app.inject({ method: 'DELETE', url, headers: { origin: WEB, ...(c.cookie && { cookie: c.cookie }) } });

describe('GET /me/profile', () => {
  it('needs a session', async () => {
    expect((await client(app).get('/me/profile')).statusCode).toBe(401);
  });

  it('returns the own profile, with the recovery email masked', async () => {
    const c = await member({ recovery: { type: 'email', email: 'leaf.demo@example.com' } });
    const p = (await c.get('/me/profile')).json();
    expect(p).toMatchObject({
      nickname: 'amal_dawn',
      avatar: 3,
      role: 'member',
      communities: expect.arrayContaining(['anxiety', 'depression']),
      recovery: { type: 'email', masked: 'l***@e***.com', verified: false }
    });
    expect(new Date(p.createdAt).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect(JSON.stringify(p)).not.toContain('leaf.demo');
  });
});

describe('community memberships', () => {
  it('join and leave are idempotent and only touch the caller', async () => {
    const amal = await member();
    const other = await member({ nickname: 'sea_glass', communities: ['panic'] });

    expect((await put(amal, '/me/communities/panic')).statusCode).toBe(204);
    expect((await put(amal, '/me/communities/panic')).statusCode).toBe(204);
    expect((await del(amal, '/me/communities/anxiety')).statusCode).toBe(204);
    expect((await del(amal, '/me/communities/anxiety')).statusCode).toBe(204);

    expect((await amal.get('/me/communities')).json().communities.sort()).toEqual(['depression', 'panic']);
    expect((await other.get('/me/communities')).json()).toEqual({ communities: ['panic'] });
  });

  it('refuses guests, bad ids and foreign origins', async () => {
    const amal = await member();
    expect((await put(client(app), '/me/communities/panic')).statusCode).toBe(401);
    expect((await put(amal, '/me/communities/Not_A_Slug')).statusCode).toBe(400);
    const foreign = await app.inject({ method: 'PUT', url: '/me/communities/panic', headers: { origin: 'https://evil.example', cookie: amal.cookie! } });
    expect(foreign.statusCode).toBe(403);
  });
});
