import { loadEnvFile } from 'node:process';
import { defineConfig } from 'vitest/config';

// Local runs read backend/.env; CI sets DATABASE_URL directly.
try {
  loadEnvFile('.env');
} catch {
  /* no .env: fine in CI */
}

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // Test files share one database: run them one after another.
    fileParallelism: false,
    // argon2 hashing is deliberately slow.
    testTimeout: 20_000
  }
});
