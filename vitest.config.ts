import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: {
      // lib/session.ts asserts this at module load; tests only need a value.
      SESSION_SECRET: 'test-secret-not-a-real-credential',
    },
  },
});
