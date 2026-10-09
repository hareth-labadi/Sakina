/**
 * Applies pending migrations from ./drizzle, then exits.
 * Runs as its own one-off step (the `migrate` service in compose.yaml), never inside the API,
 * so the API never changes the database structure while serving requests.
 */
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadDatabaseUrl } from '../config.js';
import { createDb } from './client.js';

// ./drizzle sits next to src/ (dev) and dist/ (image), two levels up from this file in both.
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

const { db, pool } = createDb(loadDatabaseUrl());
try {
  await migrate(db, { migrationsFolder });
  console.log('Migrations applied');
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
