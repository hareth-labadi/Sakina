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
    include: ['test/**/*.test.ts']
  }
});
