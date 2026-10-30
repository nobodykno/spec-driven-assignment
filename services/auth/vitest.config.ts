import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Spies (e.g. on console.error) are restored even when a test fails.
    restoreMocks: true,
    include: ['src/**/*.test.ts'],
  },
});
