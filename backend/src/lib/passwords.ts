import { hash, verify } from '@node-rs/argon2';

// OWASP's argon2id baseline (19 MiB, 2 passes). @node-rs/argon2 uses argon2id by default.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const hashSecret = (secret: string) => hash(secret, OPTIONS);

export async function verifySecret(storedHash: string, secret: string): Promise<boolean> {
  try {
    return await verify(storedHash, secret);
  } catch {
    return false;
  }
}

/**
 * Checked against when there is no account, so "unknown nickname" takes as long as
 * "wrong password" and timing doesn't reveal which accounts exist.
 */
let dummy: Promise<string> | undefined;
export async function burnVerifyTime(secret: string): Promise<void> {
  dummy ??= hashSecret('no-account-has-this-password');
  await verifySecret(await dummy, secret);
}

/**
 * Same rule as the sign-up form (web: src/lib/password.ts, level >= 2), enforced here for real:
 * at least 8 characters, not a well-known password, and at least one of: 12+ characters,
 * mixed case, a digit, a symbol. 128 max so hashing can't be used to exhaust the server.
 */
const COMMON = /^(password|12345678|azerty|qwerty|sakina)/i;

export function isAcceptablePassword(p: string): boolean {
  if (p.length < 8 || p.length > 128 || COMMON.test(p)) return false;
  return p.length >= 12 || (/[a-z]/.test(p) && /[A-Z]/.test(p)) || /\d/.test(p) || /[^A-Za-z0-9]/.test(p);
}
