import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
    },
    environment: 'node',
    exclude: ['**/*.integration.test.ts', '**/dist/**', '**/node_modules/**'],
    include: ['**/*.test.{ts,tsx}'],
  },
});
