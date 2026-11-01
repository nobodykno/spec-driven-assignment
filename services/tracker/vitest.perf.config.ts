import { defineConfig } from 'vitest/config';

// NFR-PERF-001: timing checks are machine dependent, so they run only via `pnpm --filter tracker perf`.
const PERF_DATABASE_URL =
  process.env.PERF_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_perf_test';

export default defineConfig({
  test: {
    env: { DATABASE_URL: PERF_DATABASE_URL, PERF_DATABASE_URL },
    globalSetup: ['perf/global-setup.ts'],
    fileParallelism: false,
    include: ['perf/**/*.perf.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
