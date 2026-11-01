import { execFileSync } from 'node:child_process';

// Create and migrate tracker_perf_test (name rule [a-z0-9_]+_test); never the development database.
export function setup(): void {
  const url =
    process.env.PERF_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_perf_test';
  try {
    execFileSync('pnpm', ['--filter', '@app/database', 'prepare:test-db'], {
      env: { ...process.env, TEST_DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    throw new Error('Could not prepare tracker_perf_test (is Postgres up? run pnpm db:up)', {
      cause: error,
    });
  }
}
