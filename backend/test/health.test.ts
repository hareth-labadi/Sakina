import { afterAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { createDb } from '../src/db/client.js';
import { buildServer } from '../src/server.js';

// Runs against a real Postgres (compose.dev.yaml locally, a service container in CI).
const config = loadConfig({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(config.DATABASE_URL);
const app = await buildServer(config, db);

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
    const downApp = await buildServer(config, down.db);
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
