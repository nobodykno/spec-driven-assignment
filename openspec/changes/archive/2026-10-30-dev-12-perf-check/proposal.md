Ticket: DEV-12
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 20:26 IST

# Proposal: DEV-12 Task list performance check (NFR-PERF-001)

> Jira `DEV-12` is "[DEV-1009] Task filtering — pagination, sorting and filtering"; its requirements list NFR-PERF-001 and NFR-PERF-002. The filtering work merged earlier (PR #9, change `dev-12-task-filtering`); the 10,000-task performance measurement was deferred and is delivered here. Part of the Phase 3 parallel job (see `docs/worktrees.md`).

## Why

NFR-PERF-001 says the task list endpoint answers with p95 below 300 ms for a project with 10,000 tasks. Nothing measures it yet, and NFR-PERF-002 (indexed filter and sort columns) is only checked by a grep of the migration.

## FRS requirements covered

NFR-PERF-001, NFR-PERF-002 (FR-FILT-001..003 are exercised, not changed).

## SDS sections followed / changed

- **Followed:** §5.3 (task indexes), §6 (list response `{ items, meta }`), §11 (tests; separate database).
- **Changed:** none.

## Affected packages

`services/tracker` (new `perf/` folder with its own Vitest config and a `perf` script), `docs/test-results.md`.

## New dependencies

None.

## Database changes

None. A separate database `tracker_perf_test` is created and migrated by the existing `prepare:test-db` script, whose name rule is `[a-z0-9_]+_test`.

## Rollback plan

Revert the merge commit; drop `tracker_perf_test` with `DROP DATABASE`.

## Ticket dependencies

DEV-11 (tasks) and DEV-9 (auth contracts): implemented and merged (PRs #6, #8). Jira status is still **To Do** until the Phase 3 close-out.

## Open questions

None. The perf test is not part of `pnpm test` (timing tests are flaky on busy machines); it runs with `pnpm --filter tracker perf` and its result is recorded in `docs/test-results.md`.
