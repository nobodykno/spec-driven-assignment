# Tasks: DEV-12 Task filtering

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-12`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Tracker

- [x] 1.1 Where-clause and order builders as pure functions with unit tests. Verify: `pnpm --filter tracker test`. **[FR-FILT-001, FR-FILT-002]**
- [x] 1.2 `TaskService.listForProject` with pagination meta. Verify: `pnpm --filter tracker test`. **[FR-FILT-003]**
- [x] 1.3 `GET /projects/:projectId/tasks` route and controller using the strict query schema. Verify: `pnpm --filter tracker test`. **[FR-FILT-001, FR-FILT-002, FR-FILT-003]**

## 2. Database

- [x] 2.1 Confirm the four SDS §5.3 task indexes exist in DEV-11's migration. Verify: `grep -n addIndex packages/database/migrations/*tasks*`. **[NFR-PERF-002]**

## 3. Quality gates

- [x] 3.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-13.
