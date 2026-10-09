const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

/** 12-character recovery code like K7QM-4XPT-9HDA. The server will issue real codes; this is for the mock. */
export function generateRecoveryCode(): string {
  const buf = new Uint32Array(12);
  crypto.getRandomValues(buf);
  const chars = Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8)].map((g) => g.join('')).join('-');
}

/** Dashes, spaces and case don't matter when a member types their code. */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** a***@g***.com — what admins (and the member) see. Never show the full address in the UI. */
export function maskEmail(email: string): string {
  const [user = '', domain = ''] = email.split('@');
  const [host = '', ...rest] = domain.split('.');
  return `${user.slice(0, 1)}***@${host.slice(0, 1)}***.${rest.join('.')}`;
}
