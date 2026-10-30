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
