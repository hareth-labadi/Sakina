import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt, safeEqual, sha256 } from '../../src/lib/crypto.js';
import { isReserved, nicknameKey, NICKNAME_PATTERN } from '../../src/lib/nickname.js';
import { isAcceptablePassword } from '../../src/lib/passwords.js';
import { generateRecoveryCode, isRecoveryCodeFormat, maskEmail, normalizeRecoveryCode } from '../../src/lib/recovery.js';
import { excerpt, ID_PATTERN, newId, tidy } from '../../src/lib/text.js';

const key = randomBytes(32).toString('base64');

describe('crypto', () => {
  it('encrypts so that only the same key reads it back', () => {
    const stored = encrypt('leaf.demo@example.com', key);
    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain('leaf');
    expect(decrypt(stored, key)).toBe('leaf.demo@example.com');
    expect(() => decrypt(stored, randomBytes(32).toString('base64'))).toThrow();
  });

  it('gives a different ciphertext each time (random IV)', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key));
  });

  it('refuses tampered data and unknown versions', () => {
    const stored = encrypt('some text', key);
    // Flip one real byte of the ciphertext (editing a base64 character can land on padding bits).
    const [iv, tag, data] = stored.slice(3).split('.').map((p) => Buffer.from(p, 'base64url'));
    data![0]! ^= 0xff;
    const tampered = `v1:${[iv!, tag!, data!].map((b) => b.toString('base64url')).join('.')}`;
    expect(() => decrypt(tampered, key)).toThrow();
    expect(() => decrypt(stored.replace('v1:', 'v9:'), key)).toThrow('unknown encryption version');
  });

  it('hashes and compares', () => {
    expect(sha256('a')).toBe(sha256('a'));
    expect(sha256('a')).not.toBe(sha256('b'));
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('nicknames', () => {
  it('compares case- and width-insensitively', () => {
    expect(nicknameKey(' Amal_Dawn ')).toBe('amal_dawn');
    expect(nicknameKey('ＡＭＡＬ')).toBe('amal'); // full-width letters fold (NFKC)
  });

  it('accepts letters (any script), digits, _ and . from 3 to 20', () => {
    for (const ok of ['amal', 'أمل_2', 'sea.glass', 'abc']) expect(NICKNAME_PATTERN.test(ok)).toBe(true);
    for (const no of ['ab', 'has space', 'a'.repeat(21), 'semi;colon']) expect(NICKNAME_PATTERN.test(no)).toBe(false);
  });

  it('reserves staff words', () => {
    expect(isReserved('moderator')).toBe(true);
    expect(isReserved('amal')).toBe(false);
  });
});

describe('passwords', () => {
  it('follows the sign-up form rule', () => {
    for (const ok of ['calm-river-22', 'longenoughphrase', 'Abcdefgh', 'abcdefg1']) expect(isAcceptablePassword(ok)).toBe(true);
    for (const no of ['short1', 'password123', 'qwertyuiop', 'abcdefgh', 'x'.repeat(129)]) expect(isAcceptablePassword(no)).toBe(false);
  });
});

describe('recovery codes', () => {
  it('generates the right shape from the safe alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRecoveryCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
      expect(isRecoveryCodeFormat(code)).toBe(true);
    }
  });

  it('ignores case, spaces and dashes when typed', () => {
    expect(normalizeRecoveryCode('k7qm 4xpt-9hda')).toBe('K7QM4XPT9HDA');
    expect(isRecoveryCodeFormat('k7qm 4xpt 9hda')).toBe(true);
    expect(isRecoveryCodeFormat('K7QM-4XPT-9HD0')).toBe(false); // 0 is not in the alphabet
  });

  it('masks emails', () => {
    expect(maskEmail('leaf.demo@example.com')).toBe('l***@e***.com');
    expect(maskEmail('a@mail.co.uk')).toBe('a***@m***.co.uk');
  });
});

describe('text helpers', () => {
  it('makes short URL-safe ids', () => {
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(ID_PATTERN);
    expect(ID_PATTERN.test('s1')).toBe(true);
    expect(ID_PATTERN.test('../etc')).toBe(false);
  });

  it('takes the first paragraph as the excerpt, cut at a word', () => {
    expect(excerpt('First paragraph.\n\nSecond one.')).toBe('First paragraph.');
    const long = 'word '.repeat(60).trim();
    const e = excerpt(long, 50);
    expect(e.endsWith('…')).toBe(true);
    expect(e.length).toBeLessThanOrEqual(51);
    expect(e).not.toMatch(/\s…$/);
    expect(excerpt('بقيت في طابور المتجر. '.repeat(20), 60).endsWith('…')).toBe(true);
  });

  it('tidies whitespace but keeps paragraphs', () => {
    expect(tidy('  a  \r\n\r\n\r\n\r\nb \n')).toBe('a\n\nb');
  });
});
