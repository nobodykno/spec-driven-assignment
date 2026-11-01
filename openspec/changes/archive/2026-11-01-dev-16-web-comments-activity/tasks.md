# Tasks: DEV-16 Web comments, activity and task editing

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-16`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Tasks feature

- [x] 1.1 Task mutation hooks (create, update, assign, status, archive). Verify: `pnpm --filter web typecheck`. **[FR-UI-007]**
- [x] 1.2 `TaskForm` for create/edit and `StatusSelect` with a unit test of offered transitions. Verify: `pnpm --filter web test`. **[FR-UI-007]**
- [x] 1.3 Wire forms, assign and archive into the project and task pages. Verify: `pnpm --filter web test`. **[FR-UI-007, FR-UI-010]**

## 2. Comments

- [x] 2.1 Comment hooks and permission helpers with unit tests. Verify: `pnpm --filter web test`. **[FR-UI-008]**
- [x] 2.2 `CommentsSection`: list, add, edit, delete, edited label. Verify: `pnpm --filter web test`. **[FR-UI-008, FR-UI-010]**

## 3. Activity

- [x] 3.1 Activity hook and `ActivityTimeline` with change summaries. Verify: `pnpm --filter web test`. **[FR-UI-009, FR-UI-010]**

## 4. Quality gates

- [x] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.

## Scenario to test map

Retroactive: code merged in PR #13 before the opsx workflow; tests added or retitled afterwards (task 14.1 of the retro batch).

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| web-comments-activity | Create and edit | FR-UI-007 | apps/web/src/features/tasks/components/task-form.test.tsx | 1.2, 1.3 |
| web-comments-activity | Validation and server errors | FR-UI-007 | apps/web/src/features/tasks/components/task-form.test.tsx | 1.2, 1.3 |
| web-comments-activity | Allowed transitions only | FR-UI-007 | apps/web/src/features/tasks/pages/task-detail-extras.test.tsx | 1.2 |
| web-comments-activity | Add comment | FR-UI-008 | apps/web/src/features/comments/components/comments-section.test.tsx | 2.2 |
| web-comments-activity | Buttons follow permissions | FR-UI-008 | apps/web/src/features/comments/components/comments-section.test.tsx | 2.1, 2.2 |
| web-comments-activity | Edited indicator and API error | FR-UI-008 | apps/web/src/features/comments/components/comments-section.test.tsx | 2.2 |
| web-comments-activity | Timeline entries | FR-UI-009 | apps/web/src/features/activity/components/activity-timeline.test.tsx | 3.1 |
| web-comments-activity | Empty or failed | FR-UI-009 | apps/web/src/features/activity/components/activity-timeline.test.tsx | 3.1 |
| web-comments-activity | States | FR-UI-010 | apps/web/src/features/tasks/pages/task-detail-extras.test.tsx | 2.2, 3.1 |
