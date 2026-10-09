/**
 * Auth, through the API (backend/src/modules/auth). Screens call only these functions.
 * Each returns plain result objects and never throws for expected cases (wrong password,
 * locked, taken nickname); only network or server failures throw.
 *
 * The session lives in an httpOnly cookie set by the API; nothing here stores a token.
 * The API never says whether a nickname exists when credentials are wrong.
 */
import type { Locale } from '@/i18n/routing';
import type { SessionUser } from '@/types/domain';
import { api, ApiError, request } from './api';

/* ---------- session ---------- */

/** The signed-in member, or null. */
export async function me(): Promise<SessionUser | null> {
  return (await api<{ user: SessionUser | null }>('/auth/me')).user;
}

export async function signOut(): Promise<void> {
  await request('/auth/signout', { body: {} });
}

/* ---------- sign up ---------- */

export type SignUpInput = {
  nickname: string;
  password: string;
  avatar: number;
  communities: string[];
  ageRange: string | null;
  country: string | null;
  recovery: { type: 'code'; code: string } | { type: 'email'; email: string };
  /** Language of the verification email. */
  locale: Locale;
};

/** `emailToVerify` is masked (a***@g***.com): the full address never comes back from the server. */
export type SignUpResult = { ok: true; user: SessionUser; emailToVerify: string | null } | { ok: false; error: 'nickname_taken' | 'invalid' };

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const res = await request<{ user: SessionUser; emailToVerify: string | null; error?: string }>('/auth/signup', { body: input });
  if (res.status === 201) return { ok: true, user: res.data.user, emailToVerify: res.data.emailToVerify };
  return { ok: false, error: res.data?.error === 'nickname_taken' ? 'nickname_taken' : 'invalid' };
}

/* ---------- sign in ---------- */

export type SignInResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: 'invalid'; attemptsLeft: number }
  | { ok: false; error: 'locked'; until: number }
  | { ok: false; error: 'suspended'; reason: string | null };

/** `remember`: a 30-day session; otherwise it ends with the browser (and after 12 hours at most). */
export async function signIn(nickname: string, password: string, remember: boolean): Promise<SignInResult> {
  const res = await request<{ user: SessionUser; error?: string; attemptsLeft?: number; until?: number; reason?: string | null }>('/auth/signin', {
    body: { nickname, password, remember }
  });
  const d = res.data;
  if (res.status === 200) return { ok: true, user: d.user };
  if (res.status === 423) return { ok: false, error: 'locked', until: d.until ?? Date.now() };
  if (res.status === 403 && d?.error === 'suspended') return { ok: false, error: 'suspended', reason: d.reason ?? null };
  // Too many requests from this connection: not a wrong password, so the form shows its generic error.
  if (res.status === 429) throw new ApiError(429);
  return { ok: false, error: 'invalid', attemptsLeft: d?.attemptsLeft ?? 0 };
}

/* ---------- recovery ---------- */

/** Step 1 (code path): a short-lived reset token if nickname + code match. Wrong codes lock like passwords. */
export async function verifyRecoveryCode(nickname: string, code: string): Promise<{ ok: true; token: string } | { ok: false; locked: boolean }> {
  const res = await request<{ token: string }>('/auth/recovery/code', { body: { nickname, code } });
  return res.status === 200 ? { ok: true, token: res.data.token } : { ok: false, locked: res.status === 423 };
}

/** Step 1 (email path): always answers the same way; a matching address receives a link to /forgot?token=… */
export async function requestEmailReset(nickname: string, email: string, locale: Locale): Promise<void> {
  await request('/auth/recovery/email', { body: { nickname, email, locale } });
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  const res = await request<{ valid: boolean }>('/auth/reset/check', { body: { token } });
  return res.status === 200 && res.data.valid;
}

/** Step 2: set the new password. Using a recovery code replaces it with a new one (shown once). Signs out every device. */
export async function resetPassword(token: string, newPassword: string): Promise<{ ok: true; newRecoveryCode: string | null } | { ok: false; error: 'invalid' | 'weak_password' }> {
  const res = await request<{ newRecoveryCode: string | null; error?: string }>('/auth/reset', { body: { token, password: newPassword } });
  if (res.status === 200) return { ok: true, newRecoveryCode: res.data.newRecoveryCode };
  return { ok: false, error: res.data?.error === 'weak_password' ? 'weak_password' : 'invalid' };
}

/* ---------- email verification ---------- */

/** The token from the emailed link (/verify-email?token=…). Works without being signed in. */
export async function verifyEmail(token: string): Promise<boolean> {
  return (await request('/auth/email/verify', { body: { token } })).status === 204;
}

export async function resendVerification(locale: Locale): Promise<void> {
  await request('/auth/email/resend', { body: { locale } });
}

/** Switch the signed-in member to a recovery code (drops the email). Returns the code to show once. */
export async function switchToRecoveryCode(): Promise<string> {
  return (await api<{ code: string }>('/auth/recovery/switch-to-code', { body: {} })).code;
}

/** How the signed-in member can recover their account. `email` is already masked. */
export async function getRecoveryInfo(): Promise<{ type: 'code' } | { type: 'email'; email: string; verified: boolean } | null> {
  const res = await request<{ type: 'code' } | { type: 'email'; email: string; verified: boolean }>('/auth/recovery');
  return res.status === 200 ? res.data : null;
}

/* ---------- nickname availability ---------- */

export type NicknameCheck = { available: boolean; reason?: 'taken' | 'invalid'; suggestions: string[] };

/** Whether a nickname is free; when taken, up to 3 free alternatives. */
export async function checkNickname(nickname: string): Promise<NicknameCheck> {
  return api<NicknameCheck>(`/accounts/nickname-availability?nickname=${encodeURIComponent(nickname)}`);
}
