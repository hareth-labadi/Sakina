import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests for the web app (src/**/*.test.ts). The API has its own suite in backend/.
export default defineConfig({
  resolve: {
    alias: {
      '@/messages': fileURLToPath(new URL('./messages', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true
  }
});
