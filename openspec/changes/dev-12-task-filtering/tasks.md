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

## Scenario to test map

Retroactive: tests were titled to the scenario names after merge (PR #9). The task is the original task that built the behaviour. Mocked route tests in `services/tracker/test/tasks-routes.test.ts` are titled `<FRS ID>: status mapping of <scenario name>` and are companions, not the proof.

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| task-filtering | Status and priority | FR-FILT-001 | services/tracker/test/task-filtering-scenarios.test.ts | 1.1 |
| task-filtering | Assigned to me | FR-FILT-001 | services/tracker/test/task-filtering-scenarios.test.ts | 1.1 |
| task-filtering | Unassigned | FR-FILT-001 | services/tracker/test/task-filtering-scenarios.test.ts | 1.1 |
| task-filtering | Invalid filter | FR-FILT-001 | services/tracker/test/task-filtering-scenarios.test.ts | 1.3 |
| task-filtering | Non-member lists | FR-FILT-001 | services/tracker/test/task-filtering-scenarios.test.ts | 1.3 |
| task-filtering | Sort by due date | FR-FILT-002 | services/tracker/test/task-filtering-scenarios.test.ts | 1.1 |
| task-filtering | Sort by priority | FR-FILT-002 | services/tracker/test/task-filtering-scenarios.test.ts | 1.1 |
| task-filtering | Invalid sort field | FR-FILT-002 | services/tracker/test/task-filtering-scenarios.test.ts | 1.3 |
| task-filtering | Paged response | FR-FILT-003 | services/tracker/test/task-filtering-scenarios.test.ts | 1.2 |
| task-filtering | Page size too large | FR-FILT-003 | services/tracker/test/task-filtering-scenarios.test.ts | 1.3 |
| task-filtering | Indexes exist | NFR-PERF-002 | services/tracker/test/task-filtering-scenarios.test.ts | 2.1 |
