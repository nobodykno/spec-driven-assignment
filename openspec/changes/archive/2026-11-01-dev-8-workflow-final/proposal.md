## Why

**Ticket:** DEV-8 (assignment DEV-1005), "OpenSpec workflow: ticket-to-change traceability, approval gates, verification and archival". Workflow ticket: it carries no FRS IDs (FRS section 5), so the change traces to the ticket's acceptance criteria (DEV-1005-AC-1 to 4) and to NFR-MNT-001, the NFR the existing workflow specs already cite.

Observed: the original change `dev-8-openspec-workflow` is archived (PR #4) and the opsx rework merged (PR #20), but `openspec/specs/sdd-workflow/spec.md` still describes `/sdd:*` commands, `Status: Approved` fields in `proposal.md` and a `verification.md` gate (`docs/workflow.md` "Not done here"). `scripts/check-workflow.mjs` already implements the opsx rules (gate-1 block in `handoff.md`, review PASS, command documentation). `agent-roles` says the implementer guard checks `Status: Approved`; the guard also still accepts that legacy line next to the `handoff.md` gate, so a stale `Status: Approved` keeps approving after a newer `propose` or `update` block reopens Gate 1 (security audit of DEV-7).

Proposed: bring the two specs in line with the running workflow, remove the legacy fallback from the guard, and finish `docs/workflow.md`.

## Ticket

- Key DEV-8, status read live from Jira: **Done** (summary "[DEV-1005] OpenSpec workflow ..."). The Jira workflow has no In Progress transition (To Do, In Review, Done), so the ticket stays Done and this change is a follow-up under the same key.
- Acceptance criteria: (1) WHEN apply runs on a change without approval THEN it refuses; (2) WHEN a change is archived THEN its delta specs merge into `openspec/specs/` and the folder moves to `openspec/changes/archive/`; (3) WHEN `docs/workflow.md` is read THEN every stage, command and gate is explained; (4) WHEN `openspec validate --strict` runs THEN all specs pass.
- Blocked by: DEV-1 (Done).

## What Changes

- [docs] `sdd-workflow` spec: replace the `/sdd:*` and `proposal.md` approval wording with `/opsx:*` and the `handoff.md` gate-1 rule; add the review gate before a pull request; describe archive on the follow-up branch after the PR is merged.
- [docs] `agent-roles` spec: the implementer guard approves only from the latest `gate-1 APPROVED` block of `handoff.md` that no later `propose` or `update` block follows.
- [docs] `.claude/hooks/agent-scope-guard.mjs`: remove the `Status: Approved` fallback and `isApprovedProposal` (security hardening, resolves OD-2).
- [docs] `docs/workflow.md`: remove "Not done here" for the specs, note the final state.

## Traceability

| ID | Wording (short) | Capability | Spec requirement |
|----|-----------------|------------|------------------|
| DEV-1005-AC-1 | apply refuses without approval | sdd-workflow, agent-roles | Handoff gate before implementation; Implementer works on approved changes only |
| DEV-1005-AC-2 | archive merges specs and moves folder | sdd-workflow | Archive after merge |
| DEV-1005-AC-3 | every stage, command and gate explained | sdd-workflow | Command documentation; Review gate before pull request |
| DEV-1005-AC-4 | validate --strict passes | sdd-workflow | All specs validate (unchanged, kept green) |

Scenario tags use `NFR-MNT-001` (the ID the existing scenarios carry) and requirement lines trace `DEV-1005-AC-n`; test titles start with `NFR-MNT-001:`.

## Open decisions

| ID | Question | Options | Recommendation | Impact if wrong | Status | Resolved by |
|----|----------|---------|----------------|-----------------|--------|-------------|
| OD-1 | Under which ticket does this follow-up run, as DEV-8 is Done and has no In Progress transition? | A: new change under DEV-8, ticket stays Done / B: new Jira ticket | A, matches `docs/progress.md` order 1 | UI only | Assumed | assumption, changeable at Gate 1 |
| OD-2 | Does the guard keep the legacy `Status: Approved` fallback in `proposal.md`? | A: handoff only, remove fallback / B: keep both | A, a stale approval survives a reopened Gate 1 | security | Resolved | user, 2026-11-01 |
| OD-3 | Scenario IDs: `NFR-MNT-001` as in the existing specs, or `DEV-1005-AC-n`? | A: keep NFR-MNT-001 / B: rename | A, no rename churn, tests already use it | UI only | Assumed | assumption |

## Out of scope

Sync and archive of changes dev-9 to dev-16 (own tickets), hooks that enforce append-only logs (follow-up), FRS 1.3 items. No new dependency (SDS 13).

## Capabilities

### New Capabilities
None. Both capabilities exist.

### Modified Capabilities
- `sdd-workflow`: three requirements replaced (REMOVED plus ADDED: Handoff gate before implementation, Archive after merge, Command documentation), Review gate before pull request added.
- `agent-roles`: Implementer works on approved changes only modified.

## Impact

- Files: `openspec/specs/sdd-workflow/spec.md`, `openspec/specs/agent-roles/spec.md` (at sync), `.claude/hooks/agent-scope-guard.mjs` and its test, `scripts/check-workflow.test.mjs`, `docs/workflow.md`.
- Database: no schema change. Dependencies: none.
- Existing scenarios that must stay green: the 440 tests of `pnpm test`.

## Rollback

Revert the commits. No data or migrations.

## Docs follow-up

At sync, rewrite the `## Purpose` of `sdd-workflow` (still names `/sdd:archive`); delta Purpose is ignored by sync. Archive records both capabilities as Verified. SDS: none.
