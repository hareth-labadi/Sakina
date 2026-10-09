import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('applies defaults', () => {
    const c = loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
    expect(c).toMatchObject({ NODE_ENV: 'development', PORT: 4000, LOG_LEVEL: 'info' });
  });

  it('rejects a missing or non-Postgres DATABASE_URL', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ DATABASE_URL: 'mysql://u:p@h/db' })).toThrow(/DATABASE_URL/);
  });

  it('never puts the value in the error', () => {
    expect(() => loadConfig({ DATABASE_URL: 'mysql://user:hunter2@h/db' })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') })
    );
  });
});
