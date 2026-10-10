import { describe, expect, it } from 'vitest';
import { detectIdentifying, holdReasons } from '../../src/lib/safety.js';

describe('detectIdentifying', () => {
  it.each([
    ['call me on 0555 12 34 56', 'phone'],
    ['+213 555-123-456', 'phone'],
    ['021 23 45 67 after six', 'phone'],
    ['write to amal.dawn@gmail.com', 'email'],
    ['find me @amal.dawn', 'handle'],
    ['add me on insta', 'social'],
    ['on WhatsApp', 'social'],
    ['راسلني على واتساب', 'social'],
    ['see https://example.org/x', 'link'],
    ['www.something.dz', 'link'],
    ['my name is Amal', 'name'],
    ["je m'appelle Amal", 'name'],
    ['اسمي أمل', 'name'],
    ['near rue Didouche', 'place'],
    ['à la cité des orangers', 'place'],
    ['في شارع العربي', 'place']
  ])('finds %s → %s', (text, kind) => {
    expect(detectIdentifying(text)).toContain(kind);
  });

  it.each([
    'Tuesday mornings started with my heart racing.',
    'It happened on 10.10.2026, two years after.',
    'I waited 45 minutes, then 3 more hours.',
    'بقيت في طابور المتجر',
    "J'ai passé l'appel que je repoussais depuis un mois",
    'I took a snap decision and left.',
    'Felicité est une belle idée' // "cité" inside a word is not an address
  ])('finds nothing in %s', (text) => {
    expect(detectIdentifying(text)).toEqual([]);
  });

  it('an email is not also counted as a handle', () => {
    expect(detectIdentifying('me@site.com')).not.toContain('handle');
  });
});

describe('holdReasons', () => {
  const calm = 'I slept better this week.';

  it('publishes ordinary posts in ordinary communities', () => {
    expect(holdReasons({ text: calm, communitySensitivity: 'standard', authorRole: 'member' })).toEqual([]);
    expect(holdReasons({ text: calm, communitySensitivity: 'sensitive', authorRole: 'member' })).toEqual([]);
  });

  it('holds identifying details, and everything in high-sensitivity communities', () => {
    expect(holdReasons({ text: 'call 0555123456', communitySensitivity: 'standard', authorRole: 'member' })).toEqual(['phone']);
    expect(holdReasons({ text: calm, communitySensitivity: 'high', authorRole: 'member' })).toEqual(['sensitive_community']);
  });

  it('never holds staff', () => {
    for (const role of ['therapist', 'moderator', 'admin'] as const) {
      expect(holdReasons({ text: 'call 0555123456', communitySensitivity: 'high', authorRole: role })).toEqual([]);
    }
  });
});
