# Verification: DEV-12 Task list performance check

- Ticket: DEV-12 (assignment ID DEV-1009)
- Ticket source: live MCP
- Approved by: Paramjit Jena (via chat), 2026-10-30 20:26 IST
- Branch: `feature/DEV-12-perf-check` (worktree `spec-driven-assignment-wt/DEV-12-perf`)

## Result

**READY FOR PR**: all gates pass, NFR-PERF-001 and NFR-PERF-002 have passing tests, and no critical or high finding is open. The `/cost` row was not provided and is recorded as such.

## Gate results

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 415 tests |
| `pnpm --filter tracker perf` | pass: p50 12.3 ms, p95 42.6 ms (limit 300 ms), 10,000 tasks |
| `openspec validate dev-12-perf-check --strict` | valid; all tasks ticked |

## Traceability

| FRS ID | Spec scenario | Test (file : name) | Result |
| --- | --- | --- | --- |
| NFR-PERF-001 | p95 under 300 ms with 10,000 tasks | `services/tracker/perf/task-list.perf.test.ts` : `NFR-PERF-001: p95 of the task list …` | pass |
| NFR-PERF-001 | Measurement fails when too slow | same file (assertion `toBeLessThan(300)` with the measured value in the failure message); `services/tracker/test/perf-stats.test.ts` : `NFR-PERF-001: …` | pass |
| NFR-PERF-001 | Pagination stays bounded | same perf file : bounded page (100 items, `meta.total` 10000) | pass |
| NFR-PERF-002 | Indexes exist in the migrated database | same perf file : `NFR-PERF-002: …` (four indexes via `pg_indexes`) | pass |

## Requirements with no test

None.

## Reviewer findings (`reviewer` subagent; read-only, could not run tests)

Verdict: APPROVE, no critical or high findings.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `services/tracker/vitest.perf.config.ts:4-9` | The `_test` name guard is only in `prepare-test-db.cjs`, which `global-setup` calls before any TRUNCATE | accepted: a bad name aborts the run before the seed; protection is indirect but effective |
| low | `perf/task-list.perf.test.ts:63-68` | Loop checked only the status | fixed: asserts `items.length > 0` |
| low | `perf/stats.ts:13` | Floating-point rank | fixed: `Math.ceil((p * length) / 100)` |
| low | `perf/seed.ts:65-70` | No `ANALYZE` after the bulk insert | accepted: stale statistics would make timings worse, not better |
| low | `docs/test-results.md` | Numbers come from a different run than the gates | fixed: four runs recorded with their spread |

## Deviations from the spec or SDS

- `perf/` sits outside the tracker `tsconfig` (`include: src`), so `pnpm typecheck` does not cover it; ESLint does.
- A fresh checkout needs `pnpm build` before the perf run because `@app/database` resolves from `dist`.
- Parallel job: implemented by an `implementer` subagent in its own worktree while another implementer worked in a second worktree (times in `docs/worktrees.md`).
- Verification ran in the main session, not a fresh one; independence comes from the `reviewer` subagent and from re-running every gate.
