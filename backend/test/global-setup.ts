/**
 * Runs once before all tests: creates a separate "<db>_test" database next to DATABASE_URL's
 * (so tests never touch development data) and applies the migrations to it.
 */
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error('DATABASE_URL is not set (copy backend/.env.example to backend/.env)');

  const url = new URL(base);
  const name = `${url.pathname.slice(1)}_test`;
  const admin = new pg.Client({ connectionString: base });
  await admin.connect();
  const { rowCount } = await admin.query('select 1 from pg_database where datname = $1', [name]);
  if (!rowCount) await admin.query(`create database "${name}"`);
  await admin.end();

  url.pathname = `/${name}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)) });
  await pool.end();

  project.provide('testDatabaseUrl', url.toString());
}
