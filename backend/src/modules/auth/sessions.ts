/**
 * Server-side sessions. The browser holds only a random value in an httpOnly cookie; the database
 * holds its SHA-256. Signing out (or a password reset) deletes the row, which ends the session at once.
 */
import { and, eq, gt } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { accounts, sessions } from '../../db/schema.js';
import { randomToken, sha256 } from '../../lib/crypto.js';

export const PERSISTENT_DAYS = 30;
export const BROWSER_SESSION_HOURS = 12;

export type SessionAccount = typeof accounts.$inferSelect;

/**
 * `__Host-` makes the browser refuse the cookie unless it is Secure, host-only and Path=/, so a
 * sibling subdomain can't plant or overwrite it. Needs HTTPS (or localhost), hence production only.
 */
export const cookieName = (config: Config) => (config.NODE_ENV === 'production' ? '__Host-sakina_session' : 'sakina_session');

export async function startSession(db: Db, config: Config, reply: FastifyReply, accountId: string, persistent: boolean) {
  const token = randomToken();
  const ttlMs = persistent ? PERSISTENT_DAYS * 86_400_000 : BROWSER_SESSION_HOURS * 3_600_000;
  await db.insert(sessions).values({ idHash: sha256(token), accountId, persistent, expiresAt: new Date(Date.now() + ttlMs) });
  reply.setCookie(cookieName(config), token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // No maxAge without "remember me": the cookie ends with the browser session.
    ...(persistent && { maxAge: ttlMs / 1000 })
  });
}

export function clearSessionCookie(config: Config, reply: FastifyReply) {
  reply.clearCookie(cookieName(config), { path: '/', httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' });
}

/** The signed-in, active account for this request, or null. */
export async function currentAccount(db: Db, config: Config, req: FastifyRequest): Promise<{ account: SessionAccount; idHash: string } | null> {
  const token = req.cookies[cookieName(config)];
  if (!token) return null;
  const idHash = sha256(token);
  const [row] = await db
    .select({ account: accounts })
    .from(sessions)
    .innerJoin(accounts, eq(accounts.id, sessions.accountId))
    .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  // A suspended member's open sessions stop working immediately.
  if (!row || row.account.status !== 'active') return null;
  return { account: row.account, idHash };
}

/** The signed-in account, or null after answering 401. Handlers return `reply` when it's null. */
export async function requireAccount(db: Db, config: Config, req: FastifyRequest, reply: FastifyReply) {
  const s = await currentAccount(db, config, req);
  if (!s) void reply.status(401).send({ error: 'unauthenticated' });
  return s;
}

export async function endSession(db: Db, idHash: string) {
  await db.delete(sessions).where(eq(sessions.idHash, idHash));
}

export async function endAllSessions(db: Db, accountId: string) {
  await db.delete(sessions).where(eq(sessions.accountId, accountId));
}
