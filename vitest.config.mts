import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Next preserves JSX for its compiler; component tests need an executable JSX transform.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/routes/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
});
