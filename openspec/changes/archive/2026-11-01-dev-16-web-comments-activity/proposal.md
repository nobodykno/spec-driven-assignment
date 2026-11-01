Ticket: DEV-16
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 18:51 IST

# Proposal: DEV-16 Frontend — comments, activity history and task editing

> Jira `DEV-16` is "[DEV-1013] Frontend — comments, activity history and task editing". Assignment ID **DEV-1013**.

## Why

Completes the user journey: create and edit tasks, change status along allowed transitions, assign, archive, comment, and read the activity timeline.

## FRS requirements covered

FR-UI-007, FR-UI-008, FR-UI-009, FR-UI-010; NFR-USA-001.

## SDS sections followed / changed

- **Followed:** §9.2 hooks and Zod forms, §9.3 (status changes only offer allowed transitions), §2.2 comment permissions.
- **Changed:** none.

## Affected packages

`apps/web` (`features/tasks` forms and mutations, `features/comments`).

## New dependencies

None.

## Database changes

None.

## Rollback plan

Revert the merge commit.

## Ticket dependencies

- DEV-13 and DEV-15 (endpoints and task pages) — **To Do** at proposal time; built before this change in the batch.

## Deliberate deviations (user instruction for this batch)

Minimal component tests; full RTL coverage, the Playwright journey (NFR-TST-002) and independent review are deferred.

## Open questions

None.
