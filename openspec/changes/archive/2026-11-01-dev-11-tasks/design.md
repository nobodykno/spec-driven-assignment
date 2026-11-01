# Design: DEV-11 Tasks

## Context

Follows SDS §3.1, §5.2, §5.3, §5.5, §6.2, §7.3. Contracts and the `Task` model come from DEV-9. Built in parallel with DEV-10, so it does not use `requireProjectRole`.

## Decisions

- **D1 Membership-scoped lookups.** `findTaskForMember(taskId, userId)` runs `Task.findOne` with `include: [{ model: Project, include: [{ model: ProjectMember, where: { userId }, required: true }] }]`. Missing task or non-member → 404 `NOT_FOUND` (SDS §7.3). For project-scoped routes, `findMembership(projectId, userId)` on `ProjectMember` with the same 404.
- **D2 Archived project.** Any create/modify checks `project.status` → 409 `PROJECT_ARCHIVED`; archived task → 409 `TASK_ARCHIVED`.
- **D3 Transitions.** `ALLOWED_TRANSITIONS` from `@app/shared` (FR-TASK-005) is checked in `TaskService.changeStatus`; a violation throws 409 `INVALID_STATUS_TRANSITION` with `details` listing allowed targets.
- **D4 Assignee.** Must be a `ProjectMember` of the task's project, else 400 `ASSIGNEE_NOT_MEMBER`; `null` unassigns.
- **D5 Due date.** Not in the past at creation (UTC date compare), enforced in the service in addition to Zod.
- **D6 Transactions and hooks.** Every mutating method runs in `sequelize.transaction` and calls `activityHook.record(tx, event)` before commit. `activity-hook.ts` exports an interface and a default no-op; DEV-13 replaces it with the real `ActivityService`.
- **D7 Endpoints.** `POST /projects/:projectId/tasks`, `GET /tasks/:taskId`, `PATCH /tasks/:taskId`, `PATCH /tasks/:taskId/assignee`, `PATCH /tasks/:taskId/status`, `POST /tasks/:taskId/archive`. The list endpoint `GET /projects/:projectId/tasks` is DEV-12.
- **D8 Routers.** `routes/tasks.ts` (exports `tasksRouter` for `/tasks` and `projectTasksRouter` for `/projects/:projectId/tasks`); mounted in `app.ts`.

## Docs checked

Sequelize v6 managed transactions and eager-loading filters: recorded at apply time via Context7.
