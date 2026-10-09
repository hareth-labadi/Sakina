import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../src/db/client.js';
import { buildServer } from '../src/server.js';
import { testApp, testConfig, testDb, WEB } from './helpers.js';

const { db, pool } = testDb();
const { app } = await testApp(db);

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('GET /health', () => {
  it('answers ok when the database is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('answers 503 without details when the database is down', async () => {
    const down = createDb('postgres://nobody:wrong@127.0.0.1:1/none');
    const downApp = await buildServer(testConfig(), down.db);
    const res = await downApp.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ status: 'unavailable' });
    await downApp.close();
    await down.pool.end();
  });
});

describe('unknown routes', () => {
  it('answer a plain 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'not_found' });
  });
});

describe('cross-site requests', () => {
  it('are refused when Origin is missing or foreign', async () => {
    const none = await app.inject({ method: 'POST', url: '/auth/signout' });
    const foreign = await app.inject({ method: 'POST', url: '/auth/signout', headers: { origin: 'https://evil.example' } });
    const own = await app.inject({ method: 'POST', url: '/auth/signout', headers: { origin: WEB } });
    expect([none.statusCode, foreign.statusCode, own.statusCode]).toEqual([403, 403, 204]);
    expect(foreign.json()).toEqual({ error: 'forbidden_origin' });
  });
});
