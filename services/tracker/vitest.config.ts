import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_test';

export default defineConfig({
  test: {
    // Spies (e.g. on console.error) are restored even when a test fails.
    restoreMocks: true,
    // SDS §11: every test in this package that opens a connection uses tracker_test, never tracker.
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ['test/support/global-setup.ts'],
    // Real-database files share one schema, so files run one after another.
    fileParallelism: false,
    // SDS §11: unit/app tests in src/, endpoint integration tests in test/.
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
