import { execFileSync } from 'node:child_process';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://dev:dev@localhost:5433/tracker_test';

// SDS §11: create and migrate tracker_test once per run. Needs `pnpm db:up`.
export function setup(): void {
  try {
    execFileSync('pnpm', ['--filter', '@app/database', 'prepare:test-db'], {
      env: { ...process.env, TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error) {
    throw new Error('Could not prepare tracker_test (is Postgres up? run pnpm db:up)', {
      cause: error,
    });
  }
}
