/** 0 = empty, 1 = weak, 2 = okay, 3 = strong. Client-side hint only; the server will enforce its own rules. */
export type PasswordLevel = 0 | 1 | 2 | 3;

const COMMON = /^(password|12345678|azerty|qwerty|sakina)/i;

export function passwordLevel(p: string): PasswordLevel {
  if (!p) return 0;
  if (p.length < 8 || COMMON.test(p)) return 1;
  let score = 0;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (p.length >= 16) score++;
  return score >= 3 ? 3 : score >= 1 ? 2 : 1;
}

/** Minimum level accepted by forms. */
export const MIN_PASSWORD_LEVEL: PasswordLevel = 2;
