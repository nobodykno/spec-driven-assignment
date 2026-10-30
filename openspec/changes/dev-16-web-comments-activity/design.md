# Design: DEV-16 Web comments, activity and task editing

## Context

Follows SDS §9.2–9.3 and FRS §2.2. Builds on DEV-14 (client, auth store, UI) and DEV-15 (task pages, hooks).

## Decisions

- **D1 Task forms.** `TaskForm` (create and edit) uses `react-hook-form` + `zodResolver(CreateTaskSchema | UpdateTaskSchema)`; fields title, description, priority, due date (min today on create), assignee select from project members. Create is a panel on the project page; edit is on the task detail page. Server `ASSIGNEE_NOT_MEMBER`, `TASK_ARCHIVED`, `PROJECT_ARCHIVED` surface as form/banner messages.
- **D2 Status control.** `StatusSelect` offers the current status plus `ALLOWED_TRANSITIONS[current]` from `@app/shared` only; `INVALID_STATUS_TRANSITION` from the API is still handled. Disabled on archived tasks.
- **D3 Assign and archive** via `useAssignTaskMutation`, `useArchiveTaskMutation`; mutations invalidate the task, task list and activity queries.
- **D4 Comments** (`features/comments`): list (paged, oldest first), add form, inline edit (author only), delete (author or Owner) with confirm. Buttons are rendered by `canEditComment(comment, user)` / `canDeleteComment(comment, user, role)`; an "edited" label shows when `editedAt` is set. API 403 is still shown if it occurs.
- **D5 Activity timeline** (`ActivityTimeline`): newest first, paged "load more"; each entry renders actor name, action label, relative+absolute time and a readable change summary per action (status from→to, assignee change, changed fields).
- **D6 Role in project** comes from the project query (members list) already cached by the project page; the task detail page reads `useProjectQuery(task.projectId)`.
- **D7 States** for all new views use `QueryState` (FR-UI-010).

## Docs checked

Context7 at apply time: TanStack Query v5 mutation invalidation and infinite/paged queries; react-hook-form `setError` for server details.
