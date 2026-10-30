Ticket: DEV-15
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-15 Frontend — task list, filters and detail pages

> Jira `DEV-15` is "[DEV-1012] Frontend — task list, filters and detail pages [PARALLEL after API contracts]". Assignment ID **DEV-1012**. Built in its own worktree, in parallel with DEV-14.

## Why

Members need to browse a project's tasks with filters, sorting and pagination (shareable via URL) and open a task's details.

## FRS requirements covered

FR-UI-005, FR-UI-006, FR-UI-010; NFR-USA-001.

## SDS sections followed / changed

- **Followed:** §9.1 routes (`/projects/:projectId`, `/tasks/:taskId`), §9.2 (filters in URL, one hook per endpoint), §9.3.
- **Changed:** none.

## Affected packages

`apps/web` (`features/tasks`, route module). Reuses DEV-14's API client and UI primitives.

## New dependencies

None beyond the exact versions DEV-14 adds (react-router 8.5.1, @tanstack/react-query 5.105.0, Tailwind/shadcn set, @testing-library/user-event 14.6.8). Because the two tickets run in parallel worktrees, this branch adds the same lines to `apps/web/package.json` and `docs/versions.md`; identical additions are reconciled at merge and logged in `docs/worktrees.md`.

## Database changes

None.

## Rollback plan

Revert the merge commit.

## Ticket dependencies

- DEV-11 and DEV-12 (endpoints/contracts) — **To Do** at proposal time; built before this change in the batch.
- Parallel sibling DEV-14 provides the production API client, router shell and UI primitives. This branch carries minimal stand-ins at the same paths (`lib/api-client.ts`, `components/ui/*`, `lib/utils.ts`); DEV-14's versions win at merge.

## Deliberate deviations (user instruction for this batch)

Minimal component tests; full RTL coverage, E2E and independent review deferred.

## Open questions

None.
