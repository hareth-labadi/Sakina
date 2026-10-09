import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  PUBLIC_WEB_URL: 'http://localhost:3000/some/path',
  DATA_ENCRYPTION_KEY: randomBytes(32).toString('base64')
};

describe('loadConfig', () => {
  it('applies defaults and keeps only the origin of PUBLIC_WEB_URL', () => {
    const c = loadConfig(valid);
    expect(c).toMatchObject({ NODE_ENV: 'development', PORT: 4000, LOG_LEVEL: 'info', PUBLIC_WEB_URL: 'http://localhost:3000' });
    expect(c.SMTP_URL).toBeUndefined();
  });

  it('rejects a missing or non-Postgres DATABASE_URL', () => {
    expect(() => loadConfig({ ...valid, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...valid, DATABASE_URL: 'mysql://u:p@h/db' })).toThrow(/DATABASE_URL/);
  });

  it('rejects an encryption key that is not 32 bytes', () => {
    expect(() => loadConfig({ ...valid, DATA_ENCRYPTION_KEY: '' })).toThrow(/DATA_ENCRYPTION_KEY/);
    expect(() => loadConfig({ ...valid, DATA_ENCRYPTION_KEY: randomBytes(16).toString('base64') })).toThrow(/DATA_ENCRYPTION_KEY/);
  });

  it('never puts the value in the error', () => {
    expect(() => loadConfig({ ...valid, DATABASE_URL: 'mysql://user:hunter2@h/db' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') })
    );
  });
});
