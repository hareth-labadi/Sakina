import { eq, sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { accounts, loginAttempts, recovery, sessions, tokens } from '../src/db/schema.js';
import type { memoryMailer } from '../src/lib/mailer.js';
import { purgeExpired } from '../src/modules/auth/cleanup.js';
import { client, CODE, linkToken, PASSWORD, resetDb, signUpBody, testApp, testDb } from './helpers.js';

const { db, pool } = testDb();
let app: FastifyInstance;
let mailer: ReturnType<typeof memoryMailer>;

beforeEach(async () => {
  await resetDb(db);
  ({ app, mailer } = await testApp(db));
});
afterEach(() => app.close());
afterAll(() => pool.end());

/** Mail is sent after the response; give it a tick. */
const flushMail = () => new Promise((r) => setTimeout(r, 20));

async function signUp(over: Record<string, unknown> = {}) {
  const c = client(app);
  const res = await c.post('/auth/signup', signUpBody(over));
  return { c, res };
}

describe('sign up', () => {
  it('creates the account, signs in for 30 days and stores only hashes', async () => {
    const { c, res } = await signUp();
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ user: { nickname: 'amal_dawn', avatar: 3, role: 'member', unreadNotifications: 0 }, emailToVerify: null });

    const cookie = res.cookies.find((k) => k.name === 'sakina_session')!;
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 30 * 86_400 });
    expect((await c.get('/auth/me')).json()).toMatchObject({ user: { nickname: 'amal_dawn' } });

    const [a] = await db.select().from(accounts);
    const [r] = await db.select().from(recovery);
    const [s] = await db.select().from(sessions);
    expect(a!.passwordHash).toMatch(/^\$argon2id\$/);
    expect(r!.codeHash).toMatch(/^\$argon2id\$/);
    expect(JSON.stringify([a, r, s])).not.toContain(PASSWORD);
    expect(JSON.stringify([a, r, s])).not.toContain(CODE.replaceAll('-', ''));
    expect(s!.idHash).not.toBe(cookie.value);
  });

  it('refuses a nickname that differs only by case, and reserved names', async () => {
    await signUp();
    expect((await signUp({ nickname: 'AMAL_Dawn' })).res.json()).toEqual({ error: 'nickname_taken' });
    expect((await signUp({ nickname: 'Moderator' })).res.statusCode).toBe(409);
  });

  it('validates every field like the form does', async () => {
    const bad = [
      { nickname: 'ab' },
      { nickname: 'has space' },
      { password: 'password123' },
      { password: 'short1' },
      { avatar: 8 },
      { communities: [] },
      { country: 'US' },
      { ageRange: '12-17' },
      { recovery: { type: 'code', code: 'K7QM-4XPT-9HD0' } }, // 0 is not in the alphabet
      { recovery: { type: 'email', email: 'not-an-email' } }
    ];
    for (const over of bad) expect((await signUp(over)).res.statusCode, JSON.stringify(over)).toBe(400);
    expect(await db.select().from(accounts)).toHaveLength(0);
  });

  it('with an email: encrypts it, answers masked, and sends a verification link', async () => {
    const { c, res } = await signUp({ recovery: { type: 'email', email: 'Leaf.Demo@example.com' } });
    expect(res.json().emailToVerify).toBe('L***@e***.com');

    const [r] = await db.select().from(recovery);
    expect(r!.emailEncrypted).toMatch(/^v1:/);
    expect(r!.emailEncrypted).not.toContain('example');

    await flushMail();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.to).toBe('Leaf.Demo@example.com');
    expect(mailer.sent[0]!.text).toContain('http://localhost:3000/fr/verify-email?token=');

    expect((await c.get('/auth/recovery')).json()).toEqual({ type: 'email', email: 'L***@e***.com', verified: false });
    expect((await c.post('/auth/email/verify', { token: linkToken(mailer.sent[0]!.text) })).statusCode).toBe(204);
    expect((await c.get('/auth/recovery')).json()).toMatchObject({ verified: true });
  });
});

describe('sign in', () => {
  it('works with any case of the nickname; without "remember me" the cookie ends with the browser', async () => {
    await signUp();
    const res = await client(app).post('/auth/signin', { nickname: 'Amal_Dawn', password: PASSWORD, remember: false });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: { nickname: 'amal_dawn', avatar: 3, role: 'member', unreadNotifications: 0 } });
    const cookie = res.cookies.find((k) => k.name === 'sakina_session')!;
    expect(cookie.maxAge).toBeUndefined();
    const [s] = await db.select().from(sessions).where(eq(sessions.persistent, false));
    expect(s!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(12 * 3_600_000);
  });

  it('locks after 5 failures, and an unknown nickname behaves exactly the same', async () => {
    await signUp();
    for (const nickname of ['amal_dawn', 'nobody_here']) {
      const c = client(app);
      const bodies = [];
      for (let i = 0; i < 5; i++) bodies.push((await c.post('/auth/signin', { nickname, password: 'wrong-pass-1' })).json());
      expect(bodies.slice(0, 4)).toEqual([4, 3, 2, 1].map((attemptsLeft) => ({ error: 'invalid', attemptsLeft })));
      expect(bodies[4]).toMatchObject({ error: 'locked' });
      expect(bodies[4].until - Date.now()).toBeGreaterThan(14 * 60_000);
    }
    // Locked even with the right password.
    const res = await client(app).post('/auth/signin', { nickname: 'amal_dawn', password: PASSWORD });
    expect(res.statusCode).toBe(423);
  });

  it('a success resets the count; an expired lock starts over', async () => {
    await signUp();
    const c = client(app);
    await c.post('/auth/signin', { nickname: 'amal_dawn', password: 'wrong-pass-1' });
    await c.post('/auth/signin', { nickname: 'amal_dawn', password: PASSWORD });
    expect((await c.post('/auth/signin', { nickname: 'amal_dawn', password: 'wrong-pass-1' })).json().attemptsLeft).toBe(4);

    await db.update(loginAttempts).set({ failed: 0, lockedUntil: new Date(Date.now() - 1000) });
    expect((await c.post('/auth/signin', { nickname: 'amal_dawn', password: 'wrong-pass-1' })).json().attemptsLeft).toBe(4);
  });

  it('tells a suspended member why, but only after the right password', async () => {
    const { c } = await signUp();
    await db.update(accounts).set({ status: 'suspended', suspendedReason: 'spam' });
    // Their open session stops working at once.
    expect((await c.get('/auth/me')).statusCode).toBe(401);
    expect((await client(app).post('/auth/signin', { nickname: 'amal_dawn', password: 'wrong-pass-1' })).statusCode).toBe(401);
    const res = await client(app).post('/auth/signin', { nickname: 'amal_dawn', password: PASSWORD });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: 'suspended', reason: 'spam' });
  });

  it('signing out ends the session on the server, not just the cookie', async () => {
    const { c } = await signUp();
    const stolen = c.cookie;
    expect((await c.post('/auth/signout')).statusCode).toBe(204);
    expect((await c.get('/auth/me')).statusCode).toBe(401);
    c.cookie = stolen;
    expect((await c.get('/auth/me')).statusCode).toBe(401);
  });
});

describe('recovery with a code', () => {
  it('code → reset token → new password; replaces the code, ends all sessions, works once', async () => {
    const { c: oldDevice } = await signUp();
    const c = client(app);

    expect((await c.post('/auth/recovery/code', { nickname: 'amal_dawn', code: 'AAAA-BBBB-CCCC' })).statusCode).toBe(400);
    const res = await c.post('/auth/recovery/code', { nickname: 'AMAL_DAWN', code: 'k7qm 4xpt 9hda' });
    expect(res.statusCode).toBe(200);
    const { token } = res.json();

    expect((await c.post('/auth/reset/check', { token })).json()).toEqual({ valid: true });
    expect((await c.post('/auth/reset', { token, password: 'qwerty123' })).json()).toEqual({ error: 'weak_password' });
    const reset = await c.post('/auth/reset', { token, password: 'new-quiet-sea-9' });
    expect(reset.statusCode).toBe(200);
    const { newRecoveryCode } = reset.json();
    expect(newRecoveryCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    expect((await c.post('/auth/reset', { token, password: 'another-one-77' })).json()).toEqual({ error: 'invalid' });
    expect((await oldDevice.get('/auth/me')).statusCode).toBe(401);
    expect((await c.post('/auth/signin', { nickname: 'amal_dawn', password: PASSWORD })).statusCode).toBe(401);
    expect((await c.post('/auth/signin', { nickname: 'amal_dawn', password: 'new-quiet-sea-9' })).statusCode).toBe(200);
    expect((await c.post('/auth/recovery/code', { nickname: 'amal_dawn', code: CODE })).statusCode).toBe(400);
    expect((await c.post('/auth/recovery/code', { nickname: 'amal_dawn', code: newRecoveryCode })).statusCode).toBe(200);
  });

  it('wrong codes lock like passwords, for unknown nicknames too', async () => {
    await signUp();
    for (const nickname of ['amal_dawn', 'nobody_here']) {
      const c = client(app);
      for (let i = 0; i < 4; i++) expect((await c.post('/auth/recovery/code', { nickname, code: 'AAAA-BBBB-CCCC' })).statusCode).toBe(400);
      expect((await c.post('/auth/recovery/code', { nickname, code: 'AAAA-BBBB-CCCC' })).statusCode).toBe(423);
    }
    expect((await client(app).post('/auth/recovery/code', { nickname: 'amal_dawn', code: CODE })).statusCode).toBe(423);
  });

  it('expired tokens are refused and cleaned up', async () => {
    await signUp();
    const { token } = (await client(app).post('/auth/recovery/code', { nickname: 'amal_dawn', code: CODE })).json();
    await db.update(tokens).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await client(app).post('/auth/reset/check', { token })).json()).toEqual({ valid: false });
    expect((await client(app).post('/auth/reset', { token, password: 'new-quiet-sea-9' })).statusCode).toBe(400);
    await purgeExpired(db);
    expect(await db.select().from(tokens)).toHaveLength(0);
  });
});

describe('recovery by email', () => {
  it('always answers 202; only a matching address gets a link', async () => {
    await signUp({ nickname: 'leaf_demo', recovery: { type: 'email', email: 'leaf.demo@example.com' } });
    await flushMail();
    mailer.sent.length = 0;
    const c = client(app);

    const answers = [
      await c.post('/auth/recovery/email', { nickname: 'leaf_demo', email: 'other@example.com' }),
      await c.post('/auth/recovery/email', { nickname: 'nobody_here', email: 'leaf.demo@example.com' }),
      await c.post('/auth/recovery/email', { nickname: 'Leaf_Demo', email: ' LEAF.demo@example.com ', locale: 'ar' })
    ];
    expect(answers.map((r) => [r.statusCode, r.body])).toEqual(Array(3).fill([202, '{}']));
    await flushMail();
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]!.text).toContain('http://localhost:3000/ar/forgot?token=');

    const reset = await c.post('/auth/reset', { token: linkToken(mailer.sent[0]!.text), password: 'new-quiet-sea-9' });
    expect(reset.json()).toEqual({ newRecoveryCode: null });
    const [r] = await db.select().from(recovery);
    expect(r!.emailVerified).toBe(true);
  });

  it('resend needs a session; switching to a code drops the email', async () => {
    expect((await client(app).post('/auth/email/resend')).statusCode).toBe(401);
    const { c } = await signUp({ recovery: { type: 'email', email: 'leaf.demo@example.com' } });
    expect((await c.post('/auth/email/resend', { locale: 'en' })).statusCode).toBe(204);
    await flushMail();
    expect(mailer.sent).toHaveLength(2);

    const { code } = (await c.post('/auth/recovery/switch-to-code')).json();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect((await c.get('/auth/recovery')).json()).toEqual({ type: 'code' });
    const [r] = await db.select().from(recovery);
    expect(r!.emailEncrypted).toBeNull();
    // The old verification link is dead.
    expect((await c.post('/auth/email/verify', { token: linkToken(mailer.sent[1]!.text) })).statusCode).toBe(400);
  });
});

describe('nickname availability', () => {
  it('reports available, taken (with free suggestions), reserved and invalid', async () => {
    await signUp();
    await signUp({ nickname: 'amal_dawn_2' });
    const q = async (n: string) => (await client(app).get(`/accounts/nickname-availability?nickname=${encodeURIComponent(n)}`)).json();
    expect(await q('river_calm')).toEqual({ available: true, suggestions: [] });
    const taken = await q('Amal_Dawn');
    expect(taken).toMatchObject({ available: false, reason: 'taken' });
    expect(taken.suggestions).not.toContain('amal_dawn_2');
    expect(taken.suggestions.length).toBeGreaterThan(0);
    expect(await q('admin')).toMatchObject({ available: false, reason: 'taken' });
    expect(await q('a b')).toMatchObject({ available: false, reason: 'invalid' });
  });
});

describe('rate limits', () => {
  it('cap sign-ups per IP at 10 an hour', async () => {
    for (let i = 0; i < 10; i++) await signUp({ nickname: `member_${i}` });
    const { res } = await signUp({ nickname: 'member_x' });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toEqual({ error: 'rate_limited' });
  });
});

describe('cleanup', () => {
  it('removes expired sessions and stale attempt counters, keeps live ones', async () => {
    await signUp();
    await db.insert(loginAttempts).values([
      { key: 'signin:old', failed: 2, updatedAt: new Date(Date.now() - 2 * 86_400_000) },
      { key: 'signin:recent', failed: 2 }
    ]);
    await db.execute(sql`update sessions set expires_at = now() - interval '1 second'`);
    await purgeExpired(db);
    expect(await db.select().from(sessions)).toHaveLength(0);
    expect((await db.select().from(loginAttempts)).map((r) => r.key)).toEqual(['signin:recent']);
  });
});
