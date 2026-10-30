# Tasks: DEV-16 Web comments, activity and task editing

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-16`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Tasks feature

- [ ] 1.1 Task mutation hooks (create, update, assign, status, archive). Verify: `pnpm --filter web typecheck`. **[FR-UI-007]**
- [ ] 1.2 `TaskForm` for create/edit and `StatusSelect` with a unit test of offered transitions. Verify: `pnpm --filter web test`. **[FR-UI-007]**
- [ ] 1.3 Wire forms, assign and archive into the project and task pages. Verify: `pnpm --filter web test`. **[FR-UI-007, FR-UI-010]**

## 2. Comments

- [ ] 2.1 Comment hooks and permission helpers with unit tests. Verify: `pnpm --filter web test`. **[FR-UI-008]**
- [ ] 2.2 `CommentsSection`: list, add, edit, delete, edited label. Verify: `pnpm --filter web test`. **[FR-UI-008, FR-UI-010]**

## 3. Activity

- [ ] 3.1 Activity hook and `ActivityTimeline` with change summaries. Verify: `pnpm --filter web test`. **[FR-UI-009, FR-UI-010]**

## 4. Quality gates

- [ ] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.
