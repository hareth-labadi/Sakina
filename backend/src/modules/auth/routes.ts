/**
 * Auth API. One route per function of the web app's mock (src/services/auth.ts), with the same
 * outcomes. Two rules run through every handler:
 *
 * - No account enumeration: an unknown nickname gets the same answer, the same lockout and about
 *   the same response time as a wrong password. The email-reset request always answers the same.
 * - Secrets never come back out: no hashes, no full email (masked only), recovery codes shown once.
 */
import { and, eq, gt, inArray } from 'drizzle-orm';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../../config.js';
import type { Db } from '../../db/client.js';
import { accountCommunities, accounts, recovery, tokens } from '../../db/schema.js';
import { decrypt, encrypt, randomToken, safeEqual, sha256 } from '../../lib/crypto.js';
import type { Mailer } from '../../lib/mailer.js';
import { isReserved, NICKNAME_PATTERN, nicknameKey } from '../../lib/nickname.js';
import { burnVerifyTime, hashSecret, isAcceptablePassword, verifySecret } from '../../lib/passwords.js';
import { generateRecoveryCode, isRecoveryCodeFormat, maskEmail, normalizeRecoveryCode } from '../../lib/recovery.js';
import { LOCALES, resetEmail, verifyEmail, type Locale } from './emails.js';
import { clearFailures, lockedUntil, recordFailure } from './lockout.js';
import { clearSessionCookie, currentAccount, endAllSessions, endSession, requireAccount, startSession, type SessionAccount } from './sessions.js';

export type AuthDeps = { db: Db; config: Config; mailer: Mailer };

const RESET_CODE_MINUTES = 15;
const RESET_EMAIL_MINUTES = 30;
const VERIFY_EMAIL_HOURS = 24;

/** Same lists as the sign-up form (web: sign-up-form.tsx, data/crisis.ts, lib/avatar.ts). */
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'] as const;
const COUNTRIES = ['DZ', 'FR', 'MA', 'TN', 'OTHER'] as const;
const AVATAR_COUNT = 8;

const nickname = z.string().trim().regex(NICKNAME_PATTERN);
/** Sign-in and recovery accept any string up to a sane length: rejecting by format would leak nothing, but is pointless. */
const anyNickname = z.string().trim().min(1).max(64);
const password = z.string().min(1).max(128);
const email = z.string().trim().max(254).pipe(z.email());
const locale = z.enum(LOCALES).default('en');
const token = z.string().min(20).max(100);

const signUpBody = z.object({
  nickname,
  password,
  avatar: z.number().int().min(0).max(AVATAR_COUNT - 1),
  communities: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).min(1).max(30),
  ageRange: z.enum(AGE_RANGES).nullable().default(null),
  country: z.enum(COUNTRIES).nullable().default(null),
  recovery: z.discriminatedUnion('type', [
    // The sign-up form shows the code before submitting, so it arrives from the browser. Only an
    // exact-format code (12 chars from the 31-letter alphabet) is accepted, and only its hash is kept.
    z.object({ type: z.literal('code'), code: z.string().refine(isRecoveryCodeFormat) }),
    z.object({ type: z.literal('email'), email })
  ]),
  locale
});

export const toUser = (a: SessionAccount) => ({ nickname: a.nickname, avatar: a.avatar, role: a.role, unreadNotifications: 0 });

const isUniqueViolation = (err: unknown): boolean => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e.code === '23505' || e.cause?.code === '23505';
};

/** Rate limits per client IP, on top of the per-nickname lockout. */
const limit = (max: number, timeWindow: string) => ({ config: { rateLimit: { max, timeWindow } } });

export async function authRoutes(app: FastifyInstance, { db, config, mailer }: AuthDeps) {
  const parse = <T extends z.ZodType>(schema: T, data: unknown): z.infer<T> => {
    const r = schema.safeParse(data);
    if (!r.success) throw Object.assign(new Error('invalid request'), { statusCode: 400, code: 'invalid' });
    return r.data;
  };

  /** Sends after the response, so delivery time can't reveal whether an address matched. */
  const sendLater = (req: FastifyRequest, mail: { to: string; subject: string; text: string }) => {
    setImmediate(() => void mailer.send(mail).catch((err: unknown) => req.log.error({ err }, 'email delivery failed')));
  };

  async function issueToken(accountId: string, purpose: 'password_reset' | 'email_verify', ttlMs: number) {
    const value = randomToken();
    await db.insert(tokens).values({ tokenHash: sha256(value), accountId, purpose, expiresAt: new Date(Date.now() + ttlMs) });
    return value;
  }

  /** Deletes and returns a valid token's account: each token works once. */
  async function consumeToken(value: string, purpose: 'password_reset' | 'email_verify') {
    const [row] = await db
      .delete(tokens)
      .where(and(eq(tokens.tokenHash, sha256(value)), eq(tokens.purpose, purpose), gt(tokens.expiresAt, new Date())))
      .returning({ accountId: tokens.accountId });
    return row?.accountId ?? null;
  }

  async function sendVerification(req: FastifyRequest, accountId: string, to: string, lang: Locale) {
    await db.delete(tokens).where(and(eq(tokens.accountId, accountId), eq(tokens.purpose, 'email_verify')));
    const value = await issueToken(accountId, 'email_verify', VERIFY_EMAIL_HOURS * 3_600_000);
    sendLater(req, { to, ...verifyEmail(config.PUBLIC_WEB_URL, lang, value) });
  }

  /* ---------- sign up ---------- */

  app.post('/auth/signup', limit(10, '1 hour'), async (req, reply) => {
    const body = parse(signUpBody, req.body);
    if (!isAcceptablePassword(body.password)) return reply.status(400).send({ error: 'weak_password' });
    const key = nicknameKey(body.nickname);
    if (isReserved(key)) return reply.status(409).send({ error: 'nickname_taken' });

    const passwordHash = await hashSecret(body.password);
    const codeHash = body.recovery.type === 'code' ? await hashSecret(normalizeRecoveryCode(body.recovery.code)) : null;

    let account: SessionAccount;
    try {
      account = await db.transaction(async (tx) => {
        const [a] = await tx
          .insert(accounts)
          .values({ nickname: body.nickname, nicknameKey: key, passwordHash, avatar: body.avatar, ageRange: body.ageRange, country: body.country })
          .returning();
        await tx.insert(accountCommunities).values([...new Set(body.communities)].map((communityId) => ({ accountId: a!.id, communityId })));
        await tx.insert(recovery).values(
          body.recovery.type === 'code'
            ? { accountId: a!.id, type: 'code', codeHash }
            : { accountId: a!.id, type: 'email', emailEncrypted: encrypt(body.recovery.email, config.DATA_ENCRYPTION_KEY) }
        );
        return a!;
      });
    } catch (err) {
      if (isUniqueViolation(err)) return reply.status(409).send({ error: 'nickname_taken' });
      throw err;
    }

    if (body.recovery.type === 'email') await sendVerification(req, account.id, body.recovery.email, body.locale);
    await startSession(db, config, reply, account.id, true);
    return reply.status(201).send({
      user: toUser(account),
      emailToVerify: body.recovery.type === 'email' ? maskEmail(body.recovery.email) : null
    });
  });

  /* ---------- sign in / out ---------- */

  app.post('/auth/signin', limit(20, '1 minute'), async (req, reply) => {
    const body = parse(z.object({ nickname: anyNickname, password, remember: z.boolean().default(true) }), req.body);
    const key = nicknameKey(body.nickname);
    const lockKey = `signin:${key}`;

    const until = await lockedUntil(db, lockKey);
    if (until) return reply.status(423).send({ error: 'locked', until: until.getTime() });

    const [account] = await db.select().from(accounts).where(eq(accounts.nicknameKey, key)).limit(1);
    const ok = account ? await verifySecret(account.passwordHash, body.password) : (await burnVerifyTime(body.password), false);

    if (!ok || !account) {
      const r = await recordFailure(db, lockKey);
      return r.locked
        ? reply.status(423).send({ error: 'locked', until: r.until.getTime() })
        : reply.status(401).send({ error: 'invalid', attemptsLeft: r.attemptsLeft });
    }

    await clearFailures(db, lockKey);
    // Only someone who knows the password learns the account is suspended.
    if (account.status !== 'active') return reply.status(403).send({ error: 'suspended', reason: account.suspendedReason });
    await startSession(db, config, reply, account.id, body.remember);
    return { user: toUser(account) };
  });

  app.post('/auth/signout', async (req, reply) => {
    const s = await currentAccount(db, config, req);
    if (s) await endSession(db, s.idHash);
    clearSessionCookie(config, reply);
    return reply.status(204).send();
  });

  /** Who is signed in. A guest is a normal answer here (200 with null), not an error. */
  app.get('/auth/me', async (req) => {
    const s = await currentAccount(db, config, req);
    return { user: s ? toUser(s.account) : null };
  });

  /* ---------- recovery ---------- */

  /** Step 1, code path: a short-lived reset token if nickname + code match. Locks like sign-in. */
  app.post('/auth/recovery/code', limit(20, '1 minute'), async (req, reply) => {
    const body = parse(z.object({ nickname: anyNickname, code: z.string().max(40) }), req.body);
    const key = nicknameKey(body.nickname);
    const lockKey = `recovery:${key}`;

    const until = await lockedUntil(db, lockKey);
    if (until) return reply.status(423).send({ error: 'locked', until: until.getTime() });

    const [row] = await db
      .select({ accountId: accounts.id, codeHash: recovery.codeHash })
      .from(accounts)
      .innerJoin(recovery, eq(recovery.accountId, accounts.id))
      .where(and(eq(accounts.nicknameKey, key), eq(recovery.type, 'code')))
      .limit(1);
    const code = normalizeRecoveryCode(body.code);
    const ok = row?.codeHash ? await verifySecret(row.codeHash, code) : (await burnVerifyTime(code), false);

    if (!ok || !row) {
      const r = await recordFailure(db, lockKey);
      return r.locked ? reply.status(423).send({ error: 'locked', until: r.until.getTime() }) : reply.status(400).send({ error: 'invalid' });
    }
    await clearFailures(db, lockKey);
    return { token: await issueToken(row.accountId, 'password_reset', RESET_CODE_MINUTES * 60_000) };
  });

  /** Step 1, email path: always 202, whether or not anything matched. */
  app.post('/auth/recovery/email', limit(5, '15 minutes'), async (req, reply) => {
    const body = parse(z.object({ nickname: anyNickname, email: z.string().max(254), locale }), req.body);
    const [row] = await db
      .select({ accountId: accounts.id, emailEncrypted: recovery.emailEncrypted })
      .from(accounts)
      .innerJoin(recovery, eq(recovery.accountId, accounts.id))
      .where(and(eq(accounts.nicknameKey, nicknameKey(body.nickname)), eq(recovery.type, 'email')))
      .limit(1);

    if (row?.emailEncrypted) {
      const stored = decrypt(row.emailEncrypted, config.DATA_ENCRYPTION_KEY);
      if (safeEqual(stored.trim().toLowerCase(), body.email.trim().toLowerCase())) {
        const value = await issueToken(row.accountId, 'password_reset', RESET_EMAIL_MINUTES * 60_000);
        sendLater(req, { to: stored, ...resetEmail(config.PUBLIC_WEB_URL, body.locale, value) });
      }
    }
    return reply.status(202).send({});
  });

  /** For the "new password" screen opened from an emailed link. Does not use the token up. */
  app.post('/auth/reset/check', limit(30, '1 minute'), async (req) => {
    const body = parse(z.object({ token }), req.body);
    const [row] = await db
      .select({ id: tokens.accountId })
      .from(tokens)
      .where(and(eq(tokens.tokenHash, sha256(body.token)), eq(tokens.purpose, 'password_reset'), gt(tokens.expiresAt, new Date())))
      .limit(1);
    return { valid: Boolean(row) };
  });

  /**
   * Step 2: new password. Ends every session of the account (whoever else was signed in is out).
   * A recovery code that was used is replaced by a new one, shown once; an emailed link proves the address.
   */
  app.post('/auth/reset', limit(10, '1 minute'), async (req, reply) => {
    const body = parse(z.object({ token, password }), req.body);
    if (!isAcceptablePassword(body.password)) return reply.status(400).send({ error: 'weak_password' });
    const accountId = await consumeToken(body.token, 'password_reset');
    if (!accountId) return reply.status(400).send({ error: 'invalid' });

    const passwordHash = await hashSecret(body.password);
    const [rec] = await db.select({ type: recovery.type }).from(recovery).where(eq(recovery.accountId, accountId));
    let newRecoveryCode: string | null = null;
    if (rec?.type === 'code') {
      newRecoveryCode = generateRecoveryCode();
      const codeHash = await hashSecret(normalizeRecoveryCode(newRecoveryCode));
      await db.update(recovery).set({ codeHash, updatedAt: new Date() }).where(eq(recovery.accountId, accountId));
    } else {
      await db.update(recovery).set({ emailVerified: true, updatedAt: new Date() }).where(eq(recovery.accountId, accountId));
    }

    const [account] = await db.update(accounts).set({ passwordHash }).where(eq(accounts.id, accountId)).returning({ key: accounts.nicknameKey });
    await endAllSessions(db, accountId);
    if (account) {
      await clearFailures(db, `signin:${account.key}`);
      await clearFailures(db, `recovery:${account.key}`);
    }
    return { newRecoveryCode };
  });

  /* ---------- recovery email: verify, resend, switch to a code ---------- */

  app.post('/auth/email/verify', limit(20, '1 minute'), async (req, reply) => {
    const body = parse(z.object({ token }), req.body);
    const accountId = await consumeToken(body.token, 'email_verify');
    if (!accountId) return reply.status(400).send({ error: 'invalid' });
    await db
      .update(recovery)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(and(eq(recovery.accountId, accountId), eq(recovery.type, 'email')));
    return reply.status(204).send();
  });

  app.post('/auth/email/resend', limit(3, '15 minutes'), async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const body = parse(z.object({ locale }), req.body ?? {});
    const [rec] = await db.select().from(recovery).where(eq(recovery.accountId, s.account.id));
    if (rec?.type === 'email' && !rec.emailVerified && rec.emailEncrypted) {
      await sendVerification(req, s.account.id, decrypt(rec.emailEncrypted, config.DATA_ENCRYPTION_KEY), body.locale);
    }
    return reply.status(204).send();
  });

  /** Replaces the email (or the old code) with a new recovery code, shown once. */
  app.post('/auth/recovery/switch-to-code', limit(5, '15 minutes'), async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const code = generateRecoveryCode();
    const codeHash = await hashSecret(normalizeRecoveryCode(code));
    await db
      .update(recovery)
      .set({ type: 'code', codeHash, emailEncrypted: null, emailVerified: false, updatedAt: new Date() })
      .where(eq(recovery.accountId, s.account.id));
    await db.delete(tokens).where(and(eq(tokens.accountId, s.account.id), eq(tokens.purpose, 'email_verify')));
    return { code };
  });

  /** How the signed-in member can recover their account. The email only ever leaves masked. */
  app.get('/auth/recovery', async (req, reply) => {
    const s = await requireAccount(db, config, req, reply);
    if (!s) return reply;
    const [rec] = await db.select().from(recovery).where(eq(recovery.accountId, s.account.id));
    if (!rec) return reply.status(404).send({ error: 'not_found' });
    if (rec.type === 'code' || !rec.emailEncrypted) return { type: 'code' };
    return { type: 'email', email: maskEmail(decrypt(rec.emailEncrypted, config.DATA_ENCRYPTION_KEY)), verified: rec.emailVerified };
  });

  /* ---------- nickname availability ---------- */

  app.get('/accounts/nickname-availability', limit(60, '1 minute'), async (req) => {
    const { nickname: raw } = parse(z.object({ nickname: z.string().max(64) }), req.query);
    const n = raw.trim();
    if (!NICKNAME_PATTERN.test(n)) return { available: false, reason: 'invalid', suggestions: [] };

    const key = nicknameKey(n);
    const taken = async (keys: string[]) =>
      new Set((await db.select({ k: accounts.nicknameKey }).from(accounts).where(inArray(accounts.nicknameKey, keys))).map((r) => r.k));

    if (!isReserved(key) && !(await taken([key])).has(key)) return { available: true, suggestions: [] };

    const base = (n.replace(/[^\p{L}\p{N}_.]/gu, '') || 'calm').slice(0, 14).toLowerCase();
    const candidates = [`${base}_2`, `${base}.light`, `still_${base}`, 'soft_morning', 'blue_hour'].filter((c) => NICKNAME_PATTERN.test(c));
    const used = await taken(candidates.map(nicknameKey));
    return { available: false, reason: 'taken', suggestions: candidates.filter((c) => !used.has(nicknameKey(c)) && !isReserved(c)).slice(0, 3) };
  });
}
