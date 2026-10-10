import { randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { inject } from 'vitest';
import { loadConfig, type Config } from '../src/config.js';
import { createDb, type Db } from '../src/db/client.js';
import { memoryMailer } from '../src/lib/mailer.js';
import { buildServer } from '../src/server.js';

export const WEB = 'http://localhost:3000';

export const testConfig = (overrides: Partial<Record<string, string>> = {}): Config =>
  loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: inject('testDatabaseUrl'),
    PUBLIC_WEB_URL: WEB,
    DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    ...overrides
  });

/** One pool for the whole test file. */
export function testDb() {
  return createDb(inject('testDatabaseUrl'));
}

export async function resetDb(db: Db) {
  await db.execute(sql`truncate accounts, login_attempts cascade`);
}

/** A fresh app per test: fresh rate-limit counters and an empty outbox. */
export async function testApp(db: Db, config = testConfig()) {
  const mailer = memoryMailer();
  const app = await buildServer(config, db, { mailer });
  return { app, mailer, config };
}

type Res = Awaited<ReturnType<FastifyInstance['inject']>>;

/** A browser-like client: sends the site's Origin and keeps the session cookie. */
export function client(app: FastifyInstance) {
  let cookie: string | undefined;
  const remember = (res: Res) => {
    const set = res.cookies.find((c) => c.name === 'sakina_session');
    if (set) cookie = set.value ? `sakina_session=${set.value}` : undefined;
    return res;
  };
  return {
    get cookie() {
      return cookie;
    },
    set cookie(v) {
      cookie = v;
    },
    post: async (url: string, payload?: object) =>
      remember(await app.inject({ method: 'POST', url, payload: payload ?? {}, headers: { origin: WEB, ...(cookie && { cookie }) } })),
    get: async (url: string) => remember(await app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} })),
    put: async (url: string, payload?: object) =>
      remember(await app.inject({ method: 'PUT', url, ...(payload && { payload }), headers: { origin: WEB, ...(cookie && { cookie }) } })),
    del: async (url: string) => remember(await app.inject({ method: 'DELETE', url, headers: { origin: WEB, ...(cookie && { cookie }) } }))
  };
}

export const PASSWORD = 'calm-river-22';
export const CODE = 'K7QM-4XPT-9HDA';

export const signUpBody = (over: Record<string, unknown> = {}) => ({
  nickname: 'amal_dawn',
  password: PASSWORD,
  avatar: 3,
  communities: ['anxiety', 'depression'],
  ageRange: '25-34',
  country: 'MA',
  recovery: { type: 'code', code: CODE },
  locale: 'fr',
  ...over
});

/** The token at the end of the first link in an email. */
export const linkToken = (text: string) => /token=([\w-]+)/.exec(text)?.[1] ?? '';
