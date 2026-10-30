import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Spies (e.g. on console.error) are restored even when a test fails.
    restoreMocks: true,
    // SDS §11: unit/app tests in src/, endpoint integration tests in test/.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
