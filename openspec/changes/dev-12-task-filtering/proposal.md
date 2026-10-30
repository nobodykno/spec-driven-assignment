Ticket: DEV-12
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-12 Task filtering, sorting and pagination

> Jira `DEV-12` is "[DEV-1009] Task filtering — pagination, sorting and filtering". Assignment ID **DEV-1009**. Built in its own worktree, in parallel with DEV-13.

## Why

Projects accumulate many tasks. DEV-12 adds `GET /projects/:projectId/tasks` with filters, sorting and pagination backed by indexed columns.

## FRS requirements covered

FR-FILT-001, 002, 003; NFR-PERF-001, NFR-PERF-002.

## SDS sections followed / changed

- **Followed:** §5.3 indexes, §6.1 pagination format, §6.2 list endpoint, §6.3 query parameters.
- **Changed:** none.

## Affected packages

`services/tracker` only (list route, controller, service). The query schema `TaskListQuerySchema` already exists in `@app/shared` from DEV-9.

## New dependencies

None.

## Database changes

None. Indexes come from DEV-11's migration; this change adds a migration only if a needed index is missing (checked at apply; then a new reversible migration is added and listed in tasks).

## Rollback plan

Revert the merge commit; no data changes.

## Ticket dependencies

- DEV-11 (DEV-1008) — **To Do** at proposal time; built before this change in the batch.

## Deliberate deviations (user instruction for this batch)

Minimal tests; the 10,000-task p95 measurement (NFR-PERF-001) is deferred to DEV-19; indexing (NFR-PERF-002) is implemented now.

## Open questions

None.
