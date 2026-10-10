import { randomInt } from 'node:crypto';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** Short random id for URLs (/stories/<id>): 10 base62 characters, about 59 bits. */
export function newId(): string {
  return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

/** Story and reply ids: generated ones (newId) and the sample ones (s1, r4). */
export const ID_PATTERN = /^[A-Za-z0-9]{1,32}$/;

/**
 * The preview shown in feeds: the first paragraph, cut at a word boundary to at most `max`
 * characters (… added when cut). Works for Arabic and Latin text alike.
 */
export function excerpt(body: string, max = 160): string {
  const first = body.trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, ' ').trim() ?? '';
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!?،؛]+$/u, '')}…`;
}

/** Collapses runs of blank lines and trims, keeping paragraphs. */
export function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
