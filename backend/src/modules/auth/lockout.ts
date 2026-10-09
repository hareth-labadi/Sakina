/**
 * Failed-attempt counting per nickname: 5 failures lock that nickname for 15 minutes.
 * Applies whether or not the account exists (see loginAttempts in the schema).
 */
import { eq, sql } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { loginAttempts } from '../../db/schema.js';

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

/** When the key is locked, the time it unlocks; otherwise null. */
export async function lockedUntil(db: Db, key: string): Promise<Date | null> {
  const [row] = await db.select({ until: loginAttempts.lockedUntil }).from(loginAttempts).where(eq(loginAttempts.key, key));
  return row?.until && row.until > new Date() ? row.until : null;
}

export type FailureResult = { locked: true; until: Date } | { locked: false; attemptsLeft: number };

/** Counts one failure atomically (concurrent requests can't slip extra tries through). */
export async function recordFailure(db: Db, key: string): Promise<FailureResult> {
  const [row] = await db
    .insert(loginAttempts)
    .values({ key, failed: 1 })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        // An expired lock starts a fresh count.
        failed: sql`case when ${loginAttempts.lockedUntil} is not null and ${loginAttempts.lockedUntil} <= now() then 1 else ${loginAttempts.failed} + 1 end`,
        lockedUntil: sql`case when ${loginAttempts.lockedUntil} <= now() then null else ${loginAttempts.lockedUntil} end`,
        updatedAt: sql`now()`
      }
    })
    .returning({ failed: loginAttempts.failed });

  const failed = row?.failed ?? 1;
  if (failed < MAX_ATTEMPTS) return { locked: false, attemptsLeft: MAX_ATTEMPTS - failed };

  const until = new Date(Date.now() + LOCK_MINUTES * 60_000);
  await db.update(loginAttempts).set({ failed: 0, lockedUntil: until, updatedAt: new Date() }).where(eq(loginAttempts.key, key));
  return { locked: true, until };
}

export async function clearFailures(db: Db, key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key));
}
