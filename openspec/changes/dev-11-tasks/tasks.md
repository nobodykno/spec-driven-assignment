# Tasks: DEV-11 Tasks

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-11`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Database

- [x] 1.1 Migration create tasks with enums and the four SDS §5.3 indexes (reversible). Verify: `pnpm --filter @app/database build`. **[FR-TASK-001, NFR-PERF-002]**

## 2. Tracker

- [ ] 2.1 `ActivityHook` interface with no-op default; membership-scoped task lookup helpers. Verify: `pnpm --filter tracker test`. **[FR-TASK-002, FR-TASK-004]**
- [ ] 2.2 Create task endpoint (assignee and due-date rules, archived project). Verify: `pnpm --filter tracker test`. **[FR-TASK-001]**
- [ ] 2.3 View and update task endpoints. Verify: `pnpm --filter tracker test`. **[FR-TASK-002, FR-TASK-003]**
- [ ] 2.4 Assign endpoint. Verify: `pnpm --filter tracker test`. **[FR-TASK-004]**
- [ ] 2.5 Status transition endpoint with unit test of the table. Verify: `pnpm --filter tracker test`. **[FR-TASK-005]**
- [ ] 2.6 Archive endpoint; mount routers in `app.ts`. Verify: `pnpm --filter tracker test`. **[FR-TASK-006]**

## 3. Quality gates

- [ ] 3.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-10.
