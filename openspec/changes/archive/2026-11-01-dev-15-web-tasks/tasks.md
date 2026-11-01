# Tasks: DEV-15 Web tasks

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-15`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Web groundwork

- [x] 1.1 Add pinned deps (same versions as DEV-14), minimal `lib/api-client.ts`, `lib/utils.ts` and UI stand-ins. Verify: `pnpm --filter web build && pnpm check:versions`. **[FR-UI-010]**

## 2. Tasks feature

- [x] 2.1 `useTaskFilters` URL hook with unit test (parse, defaults, page reset). Verify: `pnpm --filter web test`. **[FR-UI-005]**
- [x] 2.2 Task API hooks (`useTasksQuery`, `useTaskQuery`). Verify: `pnpm --filter web typecheck`. **[FR-UI-005, FR-UI-006]**
- [x] 2.3 Project page: filter bar, sorting, list, pagination, states. Verify: `pnpm --filter web test`. **[FR-UI-005, FR-UI-010]**
- [x] 2.4 Task detail page and route module. Verify: `pnpm --filter web test`. **[FR-UI-006, FR-UI-010]**

## 3. Quality gates

- [x] 3.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-14.

## Scenario to test map

Retroactive: tests were titled to the scenario names after merge (PR #12). The task is the original task that built the behaviour.

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| web-tasks | Filters in URL | FR-UI-005 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.3 |
| web-tasks | State survives reload | FR-UI-005 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.3 |
| web-tasks | Invalid URL value | FR-UI-005 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.1 |
| web-tasks | Pagination | FR-UI-005 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.3 |
| web-tasks | Shows fields | FR-UI-006 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.4 |
| web-tasks | Task not found | FR-UI-006 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.4 |
| web-tasks | States | FR-UI-010 | apps/web/src/features/tasks/pages/project-page.test.tsx | 2.3 |
