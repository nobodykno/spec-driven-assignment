Ticket: DEV-10
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 18:29 IST

# Proposal: DEV-10 Projects, membership and access control

> Jira `DEV-10` is "[DEV-1007] Projects — CRUD, membership and access control [PARALLEL after approved contracts]". Assignment ID **DEV-1007**. Built in its own worktree, in parallel with DEV-11.

## Why

Projects and membership are the authorization boundary for tasks, comments and activity. DEV-10 adds the project endpoints and the `requireProjectRole` helper (non-members 404, wrong role 403).

## FRS requirements covered

FR-PROJ-001, 002, 003, 004, 005, 006; FR-AUTH-006; NFR-SEC-004, NFR-REL-001 (member removal transaction).

## SDS sections followed / changed

- **Followed:** §2.2 (roles table), §5.2 projects/project_members, §5.3 `project_members(user_id)`, §5.5 member-removal transaction, §6.2 project endpoints, §7.3.
- **Changed:** none.

## Affected packages

`services/tracker` (routes, controllers, services, `requireProjectRole`), `packages/database` (migration only; models exist from DEV-9).

## New dependencies

None.

## Database changes

Migration `…-create-projects-and-members`: `projects` (status enum, owner_id FK, archived_at), `project_members` (composite PK, role enum, index on `user_id`). Reversible.

## Rollback plan

Revert the merge commit; `pnpm db:migrate:undo` drops both tables.

## Ticket dependencies

- DEV-9 (DEV-1006) — **To Do** at proposal time; this batch builds DEV-9 first and DEV-10 branches from it. Contracts come from DEV-9's `@app/shared`.

## Deliberate deviations (user instruction for this batch)

Only minimal tests now; full authorization-matrix tests, E2E and independent review are deferred (DEV-19/DEV-20). Test names still start with the FRS ID.

## Open questions

Q1 (ADMIN access to others' projects) stays open; ADMIN gets no special project access in this change.
