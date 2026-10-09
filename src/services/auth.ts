/**
 * Auth API (mock implementation). Screens call only these functions.
 * Each returns plain result objects, never throws for expected cases, and never says
 * whether a nickname exists when credentials are wrong (no account enumeration).
 *
 * Swap each body for `api('/auth/…')` when the backend exists. The real API will set
 * an httpOnly session cookie; no token is ever stored by the front end.
 */
import { generateRecoveryCode, normalizeRecoveryCode } from '@/lib/recovery';
import type { SessionUser } from '@/types/domain';
import { delay, readDb, RESERVED_NICKNAMES, writeDb, type MockAccount } from './mock-db';

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

const toUser = (a: MockAccount): SessionUser => ({ nickname: a.nickname, avatar: a.avatar, role: a.role, unreadNotifications: 0 });

/* ---------- sign up ---------- */

export type SignUpInput = {
  nickname: string;
  password: string;
  avatar: number;
  communities: string[];
  ageRange: string | null;
  country: string | null;
  recovery: { type: 'code'; code: string } | { type: 'email'; email: string };
};

export type SignUpResult = { ok: true; user: SessionUser; emailToVerify: string | null } | { ok: false; error: 'nickname_taken' | 'invalid' };

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  await delay(700);
  const db = readDb();
  const key = input.nickname.trim().toLowerCase();
  if (db.accounts[key] || RESERVED_NICKNAMES.includes(key)) return { ok: false, error: 'nickname_taken' };
  const account: MockAccount = {
    nickname: input.nickname.trim(),
    password: input.password,
    avatar: input.avatar,
    role: 'member',
    communities: input.communities,
    ageRange: input.ageRange,
    country: input.country,
    recovery: input.recovery.type === 'code' ? input.recovery : { type: 'email', email: input.recovery.email.trim(), verified: false },
    status: 'active',
    createdAt: new Date().toISOString(),
    failedAttempts: 0,
    lockedUntil: null
  };
  db.accounts[key] = account;
  writeDb(db);
  return { ok: true, user: toUser(account), emailToVerify: account.recovery.type === 'email' ? account.recovery.email : null };
}

/* ---------- sign in ---------- */

export type SignInResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: 'invalid'; attemptsLeft: number }
  | { ok: false; error: 'locked'; until: number }
  | { ok: false; error: 'suspended'; reason: string | null };

const ghostAttempts: Record<string, { failed: number; lockedUntil: number | null }> = {};

export async function signIn(nickname: string, password: string): Promise<SignInResult> {
  await delay();
  const db = readDb();
  const key = nickname.trim().toLowerCase();
  const a = db.accounts[key];
  // Unknown nicknames count down and lock exactly like real ones, so responses never reveal which accounts exist.
  if (!a) {
    const g = (ghostAttempts[key] ??= { failed: 0, lockedUntil: null });
    if (g.lockedUntil && g.lockedUntil > Date.now()) return { ok: false, error: 'locked', until: g.lockedUntil };
    g.failed += 1;
    if (g.failed >= MAX_ATTEMPTS) {
      g.failed = 0;
      g.lockedUntil = Date.now() + LOCK_MINUTES * 60_000;
      return { ok: false, error: 'locked', until: g.lockedUntil };
    }
    return { ok: false, error: 'invalid', attemptsLeft: MAX_ATTEMPTS - g.failed };
  }
  if (a.lockedUntil && a.lockedUntil > Date.now()) return { ok: false, error: 'locked', until: a.lockedUntil };
  if (a.password !== password) {
    a.failedAttempts += 1;
    if (a.failedAttempts >= MAX_ATTEMPTS) {
      a.lockedUntil = Date.now() + LOCK_MINUTES * 60_000;
      a.failedAttempts = 0;
      writeDb(db);
      return { ok: false, error: 'locked', until: a.lockedUntil };
    }
    writeDb(db);
    return { ok: false, error: 'invalid', attemptsLeft: MAX_ATTEMPTS - a.failedAttempts };
  }
  a.failedAttempts = 0;
  a.lockedUntil = null;
  writeDb(db);
  if (a.status !== 'active') return { ok: false, error: 'suspended', reason: a.suspendedReason ?? null };
  return { ok: true, user: toUser(a) };
}

/* ---------- recovery ---------- */

/** Step 1 (code path): returns a short-lived reset token if nickname + code match. */
export async function verifyRecoveryCode(nickname: string, code: string): Promise<{ ok: true; token: string } | { ok: false }> {
  await delay();
  const db = readDb();
  const a = db.accounts[nickname.trim().toLowerCase()];
  if (!a || a.recovery.type !== 'code' || normalizeRecoveryCode(a.recovery.code) !== normalizeRecoveryCode(code)) return { ok: false };
  const token = crypto.randomUUID();
  db.resetTokens[token] = a.nickname.toLowerCase();
  writeDb(db);
  return { ok: true, token };
}

/**
 * Step 1 (email path): always answers the same way so nobody can probe which emails exist.
 * The mock returns `devToken` to simulate clicking the emailed link; the real API sends an email instead.
 */
export async function requestEmailReset(nickname: string, email: string): Promise<{ devToken: string | null }> {
  await delay(600);
  const db = readDb();
  const a = db.accounts[nickname.trim().toLowerCase()];
  if (a && a.recovery.type === 'email' && a.recovery.email.toLowerCase() === email.trim().toLowerCase()) {
    const token = crypto.randomUUID();
    db.resetTokens[token] = a.nickname.toLowerCase();
    writeDb(db);
    return { devToken: token };
  }
  return { devToken: null };
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  await delay(200);
  return Boolean(readDb().resetTokens[token]);
}

/** Step 2: set the new password. Using a recovery code replaces it with a new one (shown once). */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true; newRecoveryCode: string | null } | { ok: false }> {
  await delay();
  const db = readDb();
  const key = db.resetTokens[token];
  const a = key ? db.accounts[key] : undefined;
  if (!a) return { ok: false };
  delete db.resetTokens[token];
  a.password = newPassword;
  a.failedAttempts = 0;
  a.lockedUntil = null;
  let newRecoveryCode: string | null = null;
  if (a.recovery.type === 'code') {
    newRecoveryCode = generateRecoveryCode();
    a.recovery = { type: 'code', code: newRecoveryCode };
  } else {
    a.recovery.verified = true; // the emailed link proved the address
  }
  writeDb(db);
  return { ok: true, newRecoveryCode };
}

/* ---------- email verification ---------- */

export async function verifyEmail(nickname: string): Promise<boolean> {
  await delay();
  const db = readDb();
  const a = db.accounts[nickname.toLowerCase()];
  if (!a || a.recovery.type !== 'email') return false;
  a.recovery.verified = true;
  writeDb(db);
  return true;
}

export async function resendVerification(): Promise<void> {
  await delay();
}

/** Switch an unverified email account to a recovery code. Returns the code to show once. */
export async function switchToRecoveryCode(nickname: string): Promise<string | null> {
  await delay();
  const db = readDb();
  const a = db.accounts[nickname.toLowerCase()];
  if (!a) return null;
  const code = generateRecoveryCode();
  a.recovery = { type: 'code', code };
  writeDb(db);
  return code;
}

export async function getRecoveryInfo(nickname: string): Promise<{ type: 'code' } | { type: 'email'; email: string; verified: boolean } | null> {
  const a = readDb().accounts[nickname.toLowerCase()];
  if (!a) return null;
  return a.recovery.type === 'code' ? { type: 'code' } : { type: 'email', email: a.recovery.email, verified: a.recovery.verified };
}

/* ---------- nickname availability ---------- */

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  await delay(350);
  const key = nickname.trim().toLowerCase();
  return !RESERVED_NICKNAMES.includes(key) && !readDb().accounts[key];
}

export function suggestNicknames(base: string): string[] {
  const db = readDb();
  const b = (base.replace(/[^\p{L}\p{N}_.]/gu, '') || 'calm').slice(0, 14).toLowerCase();
  return [`${b}_2`, `${b}.light`, `still_${b}`, 'soft_morning', 'blue_hour'].filter((n) => !db.accounts[n]).slice(0, 3);
}
