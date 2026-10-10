/**
 * The server-side safety check for member content. The web app shows the same patterns as hints
 * while typing (src/lib/safety.ts); this is the one that decides.
 *
 * It looks for details that could identify someone or move the conversation off Sakina: phone
 * numbers, emails, @handles, social apps, links, "my name is…", street addresses. A match doesn't
 * reject the post; it holds it for a moderator. Word lists need review by Darija-speaking moderators.
 */
export type IdentifyingKind = 'phone' | 'email' | 'handle' | 'social' | 'link' | 'name' | 'place';

const PATTERNS: [IdentifyingKind, RegExp][] = [
  // 9+ digits, allowing spaces, dots, dashes and a leading + (0555 12 34 56, 021 23 45 67,
  // +213 555-123-456). Dates such as 10.10.2026 have 8 and don't match.
  ['phone', /\+?\d(?:[\s.-]?\d){8,}/],
  ['email', /[^\s@]+@[^\s@]+\.[^\s@]{2,}/],
  ['link', /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|net|org|dz|fr|ma|tn|io|me|ly|gg)\b/i],
  ['social', /\b(?:facebook|fb\.com|instagram|insta|snapchat|tiktok|whats\s?app|telegram|messenger|discord)\b|واتساب|انستغرام|فيسبوك|سناب|تيليغرام/i],
  ['name', /(?:\bmy name is|\bje m['’]appelle|\bmon nom est|اسمي)\s+\S+/i],
  // "cité" ends in an accented letter, which \b doesn't treat as a word character.
  ['place', /\b(?:rue|street|avenue|boulevard)\b|\bcité(?!\p{L})|شارع|حي\s/iu]
];

/** Which kinds of identifying details appear in the text (empty when none). */
export function detectIdentifying(text: string): IdentifyingKind[] {
  const found = PATTERNS.filter(([, re]) => re.test(text)).map(([kind]) => kind);
  // "@name" alone (not part of an email) is a handle.
  if (!found.includes('email') && /(?:^|\s)@[\w.]{3,}/.test(text)) found.push('handle');
  return found;
}

export type HoldInput = {
  text: string;
  communitySensitivity: 'standard' | 'sensitive' | 'high';
  authorRole: 'member' | 'therapist' | 'moderator' | 'admin';
};

/**
 * Why a new story or reply should wait for a moderator (empty: publish now).
 * Decided 2026-10-10: publish at once unless it contains identifying details or it is in a
 * high-sensitivity community. Staff (therapists, moderators, admins) are never held.
 */
export function holdReasons({ text, communitySensitivity, authorRole }: HoldInput): string[] {
  if (authorRole !== 'member') return [];
  const reasons: string[] = detectIdentifying(text);
  if (communitySensitivity === 'high') reasons.push('sensitive_community');
  return reasons;
}
