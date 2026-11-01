# Tasks: DEV-11 Tasks

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-11`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Database

- [x] 1.1 Migration create tasks with enums and the four SDS §5.3 indexes (reversible). Verify: `pnpm --filter @app/database build`. **[FR-TASK-001, NFR-PERF-002]**

## 2. Tracker

- [x] 2.1 `ActivityHook` interface with no-op default; membership-scoped task lookup helpers. Verify: `pnpm --filter tracker test`. **[FR-TASK-002, FR-TASK-004]**
- [x] 2.2 Create task endpoint (assignee and due-date rules, archived project). Verify: `pnpm --filter tracker test`. **[FR-TASK-001]**
- [x] 2.3 View and update task endpoints. Verify: `pnpm --filter tracker test`. **[FR-TASK-002, FR-TASK-003]**
- [x] 2.4 Assign endpoint. Verify: `pnpm --filter tracker test`. **[FR-TASK-004]**
- [x] 2.5 Status transition endpoint with unit test of the table. Verify: `pnpm --filter tracker test`. **[FR-TASK-005]**
- [x] 2.6 Archive endpoint; mount routers in `app.ts`. Verify: `pnpm --filter tracker test`. **[FR-TASK-006]**

## 3. Quality gates

- [x] 3.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-10.

## Scenario to test map

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| tasks | Valid task | FR-TASK-001 | services/tracker/test/tasks-scenarios.test.ts | 2.2 |
| tasks | Assignee not a member | FR-TASK-001 | services/tracker/test/tasks-scenarios.test.ts | 2.2 |
| tasks | Past due date | FR-TASK-001 | services/tracker/test/tasks-scenarios.test.ts | 2.2 |
| tasks | Non-member creates | FR-TASK-001 | services/tracker/test/tasks-scenarios.test.ts | 2.2 |
| tasks | Archived project | FR-TASK-001 | services/tracker/test/tasks-scenarios.test.ts | 2.2 |
| tasks | Member views | FR-TASK-002 | services/tracker/test/tasks-scenarios.test.ts | 2.3 |
| tasks | Missing or foreign task | FR-TASK-002 | services/tracker/test/tasks-scenarios.test.ts | 2.3 |
| tasks | Valid update | FR-TASK-003 | services/tracker/test/tasks-scenarios.test.ts | 2.3 |
| tasks | Archived task | FR-TASK-003 | services/tracker/test/tasks-scenarios.test.ts | 2.3 |
| tasks | Assign member | FR-TASK-004 | services/tracker/test/tasks-scenarios.test.ts | 2.4 |
| tasks | Assign non-member | FR-TASK-004 | services/tracker/test/tasks-scenarios.test.ts | 2.4 |
| tasks | Allowed transition | FR-TASK-005 | services/tracker/test/tasks-scenarios.test.ts | 2.5 |
| tasks | Disallowed transition | FR-TASK-005 | services/tracker/test/tasks-scenarios.test.ts | 2.5 |
| tasks | Archive | FR-TASK-006 | services/tracker/test/tasks-scenarios.test.ts | 2.6 |
| tasks | Modify archived | FR-TASK-006 | services/tracker/test/tasks-scenarios.test.ts | 2.6 |
| tasks | Non-member archives | FR-TASK-006 | services/tracker/test/tasks-scenarios.test.ts | 2.6 |
