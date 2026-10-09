import { and, isNull, lt, or } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import { loginAttempts, sessions, tokens } from '../../db/schema.js';

/**
 * Deletes what is no longer needed: expired sessions and tokens, and failed-attempt counters that
 * are neither locked nor recent. Keeps no more data than the rules need.
 */
export async function purgeExpired(db: Db) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(tokens).where(lt(tokens.expiresAt, now));
  await db
    .delete(loginAttempts)
    .where(and(lt(loginAttempts.updatedAt, dayAgo), or(isNull(loginAttempts.lockedUntil), lt(loginAttempts.lockedUntil, now))));
}
