## Context

DEV-8 (DEV-1005) built the workflow around `/sdd:*` commands and `Status: Approved` in `proposal.md`. The opsx rework (PR #20) replaced both with `/opsx:*` and the `handoff.md` stage log, and `scripts/check-workflow.mjs` and `.claude/hooks/agent-scope-guard.mjs` follow the new rules. The two specs were left behind. Follows `.claude/rules/handoff.md` and `.claude/rules/checkpoint.md`.

## Goals / Non-Goals

Goals: specs describe what the checkers and the guard do; the guard approves only from the handoff gate; `docs/workflow.md` has no stale "not done" note. Non-goals: new commands, new hooks for append-only logs, changes to services or web.

## Contract

No `packages/shared` change. The rule contract is the handoff block format `### <stage> | <date> | <STATUS>` (`handoff.md` rules), unchanged.

## Data model

No schema change. SDS section 5 is untouched.

## Decisions

- **D1** (resolves OD-2): `readApproval` returns `approvedByHandoff` only; `approvedByProposal` and `isApprovedProposal` are deleted. Reason: a stale `Status: Approved` outlives a reopened Gate 1. Rejected: keep both (leaves the gap).
- **D2** (resolves OD-3): scenario tags stay `NFR-MNT-001`, requirements trace `DEV-1005-AC-n`. Reason: tests and existing scenarios use it. Rejected: rename all.
- **D3**: the two archive scenarios are checked by reading `.claude/commands/opsx/archive.md` in a test, as the rest of `check-workflow.test.mjs` reads real files. Rejected: a new checker function, more code for text that rarely changes.
- **D4** (resolves OD-1): follow-up change under DEV-8, ticket stays Done, no Jira transition.
- **D5**: test titles are `NFR-MNT-001: <scenario name>`, one test per scenario; existing tests with other wording are renamed through `test-writer`, never weakened.

## Layer plan

[docs] `scripts/check-workflow.test.mjs` (14 scenario tests, 2 new for archive), `.claude/hooks/agent-scope-guard.test.mjs` (5 scenario tests; the legacy-approval test is removed with the function), `.claude/hooks/agent-scope-guard.mjs` (D1), `docs/workflow.md`. No routes, query keys or error mapping.

## Security and privacy

Follows SDS section 7. D1 narrows a permission: the guard that confines the `implementer` trusts one source instead of two. Handoff blocks hold paths, counts and statuses only; no secrets are written. The guard still fails closed on any read error.

## Docs checked

No library API is used (Node `fs`, `path`, `child_process` already in the files). Context7 not needed.

## Risks / Trade-offs

The handoff is a plain file the main session writes, so the guard trusts the session that edits it (accepted at DEV-7 Gate 2, recorded in its PR). Existing branches approved only by `Status: Approved` need a `gate-1` block; the archived and active changes pre-date the guard use.

## Migration and rollback

Revert the commits. No migration.

## Open questions

OD-1 and OD-3 are Assumed, OD-2 is Resolved; none is Open.
