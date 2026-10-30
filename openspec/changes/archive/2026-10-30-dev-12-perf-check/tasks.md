# Tasks: DEV-12 Task list performance check

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-12`. Test names start with the FRS ID. Tests before implementation. **[PARALLEL]** worktree with `dev-19-nfr-gaps`.

## 1. Tracker

- [x] 1.1 `perf/` runner: `vitest.perf.config.ts`, `perf` script, seeding helper for 10,000 tasks, and the failing test file (index check and p95 assertion). Verify: `pnpm --filter tracker perf`. **[NFR-PERF-001, NFR-PERF-002]**
- [x] 1.2 Measurement helper (nearest-rank p95) with a unit test, used by the perf test. Verify: `pnpm --filter tracker test`. **[NFR-PERF-001]**
- [x] 1.3 Run the check and record p50/p95/max in `docs/test-results.md`. Verify: `pnpm --filter tracker perf` passes. **[NFR-PERF-001]**

## 2. Quality gates

- [x] 2.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass, and `pnpm --filter tracker perf` passes.
