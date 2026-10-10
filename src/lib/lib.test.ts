import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LEVEL, passwordLevel } from './password';
import { generateRecoveryCode, isValidEmail, maskEmail, normalizeRecoveryCode } from './recovery';
import { detectPii, isValidNickname } from './safety';

describe('passwordLevel', () => {
  it('rates empty, weak, okay and strong', () => {
    expect(passwordLevel('')).toBe(0);
    expect(passwordLevel('short')).toBe(1);
    expect(passwordLevel('password123')).toBe(1); // well-known start
    expect(passwordLevel('abcdefgh')).toBe(1); // nothing extra
    expect(passwordLevel('abcdefg1')).toBe(2);
    expect(passwordLevel('Calm-River-22-long')).toBe(3);
  });

  it('accepts the demo password at the form minimum', () => {
    expect(passwordLevel('calm-river-22')).toBeGreaterThanOrEqual(MIN_PASSWORD_LEVEL);
  });
});

describe('recovery helpers', () => {
  it('generates codes in the shape the API accepts', () => {
    for (let i = 0; i < 30; i++) expect(generateRecoveryCode()).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it('normalizes typed codes', () => {
    expect(normalizeRecoveryCode(' k7qm-4xpt 9hda ')).toBe('K7QM4XPT9HDA');
  });

  it('checks and masks emails', () => {
    expect(isValidEmail('leaf.demo@example.com')).toBe(true);
    expect(isValidEmail('leaf.demo@example')).toBe(false);
    expect(isValidEmail('no at sign')).toBe(false);
    expect(maskEmail('leaf.demo@example.com')).toBe('l***@e***.com');
  });
});

describe('identifying-details hints', () => {
  it('spots what the API would hold', () => {
    expect(detectPii('call 0555 12 34 56')).toContain('phone');
    expect(detectPii('me@site.com')).toEqual(['email']);
    expect(detectPii('add me @amal.dawn')).toContain('handle');
    expect(detectPii('on whatsapp')).toContain('social');
    expect(detectPii("je m'appelle Amal")).toContain('name');
    expect(detectPii('rue Didouche')).toContain('place');
  });

  it('leaves ordinary text alone', () => {
    expect(detectPii('Tuesday mornings started with my heart racing.')).toEqual([]);
    expect(detectPii('بقيت في طابور المتجر')).toEqual([]);
  });

  it('validates nicknames like the API', () => {
    expect(isValidNickname('amal_dawn')).toBe(true);
    expect(isValidNickname('أمل.2')).toBe(true);
    expect(isValidNickname('ab')).toBe(false);
    expect(isValidNickname('has space')).toBe(false);
  });
});
