# Design: DEV-10 Projects and membership

## Context

Follows SDS §2.2, §3.1, §5, §6.2, §7.3. Models and Zod contracts come from DEV-9. DEV-11 is built in parallel; the two share only `services/tracker/src/app.ts` and the router mount points.

## Decisions

- **D1 `requireProjectRole(projectId, userId, roles)`** in `services/tracker/src/services/project-access.ts`: one query on `ProjectMember` joined to `Project`; returns `{ project, role }`; no membership → `AppError('NOT_FOUND', 404)`; role not in `roles` → `AppError('FORBIDDEN', 403)`. Never fetch-then-check (SDS §7.3).
- **D2 Archived guard.** `assertProjectActive(project)` throws 409 `PROJECT_ARCHIVED`; used by update and member changes (tasks/comments reuse it in DEV-11/13).
- **D3 Listing.** `GET /projects` joins through `project_members` for the caller; `includeArchived=true` includes archived.
- **D4 Create.** One transaction: project + OWNER membership.
- **D5 Add member** by email (CITEXT lookup): unknown → 404 `USER_NOT_FOUND`, duplicate → 409 `ALREADY_MEMBER`.
- **D6 Remove member** in one transaction: reject with 409 `LAST_OWNER` if it removes the only OWNER; otherwise delete membership, null `assignee_id` on their tasks in this project and insert one `TASK_ASSIGNED` activity per task (`from` user → `to` null) directly via the `Activity` model (DEV-13 later offers `ActivityService`).
- **D7 Mount.** `routes/projects.ts` exports a router mounted at `/projects` in `app.ts`.

## Docs checked

Sequelize v6 transactions/`include` with `required: true`: recorded at apply time via Context7.
