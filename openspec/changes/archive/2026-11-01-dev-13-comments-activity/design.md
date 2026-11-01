# Design: DEV-13 Comments and activity

## Context

Follows SDS §5.5, §6.2, §8. DEV-11 defined `ActivityHook` (`record(tx, event)`) with a no-op default and calls it inside every task transaction.

## Decisions

- **D1 `ActivityService.record(tx, { taskId, actorId, action, metadata })`** inserts one `Activity` row with the caller's transaction. It implements `ActivityHook`; `activity-hook.ts` now exports it as the default. A failing insert rejects, rolling back the task change (FR-ACT-001, NFR-REL-001).
- **D2 Metadata shapes** per FRS table: `TASK_CREATED {title,status,priority}`, `TASK_UPDATED {changes:{field:{from,to}}}` (changed fields only), `TASK_ASSIGNED {from,to}`, `TASK_STATUS_CHANGED {from,to}`, `TASK_ARCHIVED {}`. DEV-11 already passes events in these shapes.
- **D3 Append-only.** No PATCH/PUT/DELETE routes for activity; `ActivityService` exposes only `record` and `listForTask`.
- **D4 View.** `GET /tasks/:taskId/activity` newest first, paginated, each item with actor `{id,name}`, action, createdAt, metadata. Member only (404 otherwise).
- **D5 Comments.** `POST/GET /tasks/:taskId/comments` (member; add blocked on archived task 409 `TASK_ARCHIVED` and archived project 409 `PROJECT_ARCHIVED`; list chronological, paginated, author `{id,name}`). `PATCH /comments/:commentId`: only author (else 403) sets body and `editedAt`. `DELETE /comments/:commentId`: author or project Owner, soft delete (paranoid), 204; other member 403; non-member 404.
- **D6 Comment lookup** is membership-scoped via the comment's task → project → member join, so non-members get 404.

## Docs checked

Sequelize v6 paranoid models and JSONB columns: recorded at apply time via Context7.
