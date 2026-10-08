/**
 * Client-side HINTS only. They help members notice identifying details before posting.
 * The real safety check (risk detection, holds for therapists) must run on the server,
 * with word lists the admin edits and that Darija-speaking moderators review.
 */
export type PiiKind = 'phone' | 'email' | 'handle' | 'social' | 'name' | 'place';

export function detectPii(text: string): PiiKind[] {
  const x = text ?? '';
  const found = new Set<PiiKind>();
  if (/(\+?\d[\d\s.-]{7,}\d)/.test(x)) found.add('phone');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(x)) found.add('email');
  else if (/(^|\s)@[\w.]{3,}/.test(x)) found.add('handle');
  if (/(facebook|instagram|insta\b|snapchat|tiktok|whatsapp|telegram|fb\.com)/i.test(x)) found.add('social');
  if (/(my name is|je m'appelle|je m’appelle|mon nom est|اسمي)\s+\S+/i.test(x)) found.add('name');
  if (/(\brue\b|\bstreet\b|\bavenue\b|\bcité\b|شارع|حي )/i.test(x)) found.add('place');
  return [...found];
}

export const NICKNAME_PATTERN = /^[\p{L}\p{N}_.]{3,20}$/u;
export const isValidNickname = (n: string) => NICKNAME_PATTERN.test(n);
