Ticket: DEV-13
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 18:39 IST

# Proposal: DEV-13 Comments and activity history

> Jira `DEV-13` is "[DEV-1010] Comments and activity history". Assignment ID **DEV-1010**. Built in its own worktree, in parallel with DEV-12.

## Why

Collaboration needs comments, and an audit trail of task changes. DEV-13 adds comment add/edit/delete/list and the append-only activity history, written in the same transaction as each task change.

## FRS requirements covered

FR-CMT-001, 002, 003, 004; FR-ACT-001, 002; NFR-REL-001.

## SDS sections followed / changed

- **Followed:** §5.2 comments/activities, §5.3 indexes, §5.5 transactions, §6.2 comment/activity endpoints, §8.
- **Changed:** none.

## Affected packages

`services/tracker` (comments + activity routes/controllers/services, real `ActivityService` replacing DEV-11's no-op hook), `packages/database` (migration only; models from DEV-9).

## New dependencies

None.

## Database changes

Migration `…-create-comments-and-activities`: `comments` (body ≤ 2000, `edited_at`, `deleted_at`, index `(task_id, created_at)`), `activities` (action enum, JSONB metadata, index `(task_id, created_at DESC)`). Reversible.

## Rollback plan

Revert the merge commit; `pnpm db:migrate:undo` drops both tables. Task behaviour reverts to the no-op hook.

## Ticket dependencies

- DEV-11 (DEV-1008) — **To Do** at proposal time; built before this change in the batch.

## Deliberate deviations (user instruction for this batch)

Minimal tests; the production DB-role grant restriction on `activities` (SDS §8) is documented, not provisioned. Full rollback/transaction tests are deferred to DEV-19.

## Open questions

None.
