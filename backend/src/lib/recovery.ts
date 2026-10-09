import { randomInt } from 'node:crypto';

/** Same alphabet and shape as the web app (src/lib/recovery.ts): no 0/O, 1/I/L. ~59 bits. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE = new RegExp(`^[${ALPHABET}]{12}$`);

/** K7QM-4XPT-9HDA */
export function generateRecoveryCode(): string {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

/** Dashes, spaces and case don't matter when a member types their code. */
export const normalizeRecoveryCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

export const isRecoveryCodeFormat = (code: string) => CODE.test(normalizeRecoveryCode(code));

/** a***@g***.com: the only form of the address that ever leaves the server. */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const [host = '', ...rest] = domain.split('.');
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***.${rest.join('.')}`;
}
