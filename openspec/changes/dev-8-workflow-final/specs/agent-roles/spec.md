## MODIFIED Requirements

### Requirement: Implementer works on approved changes only
The `implementer` agent SHALL implement tasks of an approved OpenSpec change, test first, and SHALL NOT push, open or merge pull requests, or write to Jira, and an agent-scoped hook SHALL block those actions and SHALL block Edit and Write unless the latest `gate-1` block of the current branch's change `handoff.md` is `APPROVED` and no `propose` or `update` block follows it.

Traces: DEV-1005-AC-1

#### Scenario: Edits allowed on an approved change [NFR-MNT-001]
- **WHEN** the implementer edits a file on a branch whose change `handoff.md` holds `propose` then `gate-1 APPROVED`
- **THEN** the hook allows the edit

#### Scenario: Edits blocked on an unapproved change [NFR-MNT-001]
- **WHEN** the implementer edits a file on a branch whose change has no `gate-1 APPROVED` block or has no change
- **THEN** the hook blocks the call (exit 2) with a message that the change is not approved

#### Scenario: Reopened gate blocks edits [NFR-MNT-001]
- **WHEN** an `update` block follows `gate-1 APPROVED` and the implementer edits a file
- **THEN** the hook blocks the call (exit 2)

#### Scenario: Legacy proposal status does not approve [NFR-MNT-001]
- **WHEN** `proposal.md` holds `Status: Approved` with approver and date but the handoff has no `gate-1 APPROVED` block
- **THEN** the hook blocks the edit (exit 2)

#### Scenario: Push and Jira writes blocked [NFR-MNT-001]
- **WHEN** the implementer runs `git push`, `gh pr create`, `gh pr merge` or a Jira write tool
- **THEN** the hook blocks the call (exit 2) and names the action
