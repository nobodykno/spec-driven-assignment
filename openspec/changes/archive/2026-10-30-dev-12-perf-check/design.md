# Design: DEV-12 Task list performance check

## Context

Follows SDS §5.3, §6 and §11. Test and tooling only; no production code changes. If the measurement fails, the fix is a separate bug ticket (Phase 3 rule), not part of this change.

## Decisions

- **D1 Separate runner.** `services/tracker/perf/task-list.perf.test.ts` with `vitest.perf.config.ts` and script `perf`. It is excluded from `pnpm test` because timing assertions are machine dependent. Test names start with the FRS ID so the coverage report counts them.
- **D2 Database.** `tracker_perf_test`, created and migrated by `pnpm --filter @app/database prepare:test-db` (`TEST_DATABASE_URL`), never the development database.
- **D3 Seeding.** One user, one project and 10,000 tasks inserted with `Task.bulkCreate` in batches of 1,000, with a spread of statuses, priorities, assignees (a few members) and due dates, so every filter hits a realistic share of rows.
- **D4 Measurement.** The real `createApp` (real services) through Supertest, 200 requests cycling through five query shapes, preceded by 20 warm-up requests; per-request time from `performance.now()`; p95 by the nearest-rank method on the sorted samples.
- **D5 Indexes.** A query on `pg_indexes` asserts the four SDS §5.3 task indexes exist in the migrated database (NFR-PERF-002).
- **D6 Result.** The measured p50, p95 and max go in `docs/test-results.md` (section "Performance"), copied from the run.

## Docs checked

Context7 at apply time: Vitest 5 config files and `include`; Sequelize 6 `bulkCreate`. If Context7 is unavailable the limitation is noted here and authoritative docs are used (Rule 5).
