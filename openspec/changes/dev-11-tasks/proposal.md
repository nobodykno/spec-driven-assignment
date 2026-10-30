Ticket: DEV-11
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-11 Tasks — CRUD, assignment, status, priority, deadlines

> Jira `DEV-11` is "[DEV-1008] Tasks — CRUD, assignment, status, priority and deadlines [PARALLEL after auth and API contracts]". Assignment ID **DEV-1008**. Built in its own worktree, in parallel with DEV-10.

## Why

Tasks are the core entity. DEV-11 delivers create, view, update, assign, status transitions and archive in `services/tracker`, with activity hook points that DEV-13 completes.

## FRS requirements covered

FR-TASK-001, 002, 003, 004, 005, 006; NFR-SEC-004; NFR-PERF-002 (indexes, SDS §5.3).

## SDS sections followed / changed

- **Followed:** §5.2 tasks, §5.3 task indexes, §5.5 transactions, §6.2 task endpoints, §7.3 membership-scoped queries.
- **Changed:** none.

## Affected packages

`services/tracker` (routes, controllers, services), `packages/database` (migration only; model from DEV-9).

## New dependencies

None.

## Database changes

Migration `…-create-tasks`: `tasks` table with status/priority enums, FKs, `archived_at`, and indexes `(project_id, archived_at, status)`, `(project_id, assignee_id)`, `(project_id, due_date)`, `(project_id, priority)`. Reversible.

## Rollback plan

Revert the merge commit; `pnpm db:migrate:undo` drops `tasks` and its enums.

## Ticket dependencies

- DEV-9 (DEV-1006) — **To Do** at proposal time; this batch builds DEV-9 first and branches from it.

## Deliberate deviations (user instruction for this batch)

Minimal tests now; full suites, E2E and independent review deferred. The activity entry itself is a no-op hook here (`ActivityHook`); DEV-13 supplies the real, same-transaction implementation (DEV-13 owns FR-ACT-001).

## Open questions

A2 (any member may archive tasks) and A4 (archiving is one-way) are implemented as assumed in the FRS.
