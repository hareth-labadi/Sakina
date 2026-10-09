import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** 256-bit random value, URL-safe. Used for session cookies and emailed links. */
export const randomToken = () => randomBytes(32).toString('base64url');

/** What we store for a token: a database leak must not hand out working sessions or links. */
export const sha256 = (value: string) => createHash('sha256').update(value).digest('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * AES-256-GCM for personal data at rest (the recovery email).
 * Stored as "v1:<iv>.<tag>.<ciphertext>" (base64url) so the key or scheme can be rotated later.
 */
export function encrypt(plain: string, keyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return `v1:${[iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.')}`;
}

export function decrypt(stored: string, keyB64: string): string {
  const [version, rest = ''] = stored.split(':');
  if (version !== 'v1') throw new Error('unknown encryption version');
  const [iv, tag, data] = rest.split('.').map((p) => Buffer.from(p, 'base64url'));
  if (!iv || !tag || !data) throw new Error('malformed ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
