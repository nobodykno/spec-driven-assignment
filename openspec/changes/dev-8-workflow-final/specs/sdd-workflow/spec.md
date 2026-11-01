## REMOVED Requirements

### Requirement: Approval gate before implementation
**Reason**: Gate 1 moved from `Status: Approved` fields in `proposal.md` (`/sdd:apply`) to the `gate-1` block of `handoff.md` (`/opsx:apply`).
**Migration**: Replaced by "Handoff gate before implementation".

### Requirement: Archive command
**Reason**: `/sdd:archive` and `verification.md` no longer exist; archive is `/opsx:archive` on a follow-up branch after the merge.
**Migration**: Replaced by "Archive after merge".

### Requirement: Workflow documentation
**Reason**: The document now covers the `/opsx:*` and top-level commands, not `/sdd:*`.
**Migration**: Replaced by "Command documentation".

## ADDED Requirements

### Requirement: Handoff gate before implementation
`/opsx:apply` SHALL refuse to implement a change unless the latest `gate-1` block in its `handoff.md` is `APPROVED` and no `propose` or `update` block follows it, and `scripts/check-workflow.mjs` SHALL expose this rule as a tested function.

Traces: DEV-1005-AC-1

#### Scenario: Propose then approved gate passes [NFR-MNT-001]
- **WHEN** the handoff holds a `propose` block followed by `gate-1 APPROVED`
- **THEN** the gate allows implementation

#### Scenario: No gate block refused [NFR-MNT-001]
- **WHEN** the handoff holds a `propose` block and no `gate-1` block
- **THEN** the gate refuses and names the missing approval

#### Scenario: Rejected gate refused [NFR-MNT-001]
- **WHEN** the latest `gate-1` block is `REJECTED`
- **THEN** the gate refuses

#### Scenario: Update after approval cancels it [NFR-MNT-001]
- **WHEN** an `update` block follows `gate-1 APPROVED`
- **THEN** the gate refuses until Gate 1 is approved again

#### Scenario: Missing handoff refused [NFR-MNT-001]
- **WHEN** the change has no `handoff.md`
- **THEN** the gate refuses

### Requirement: Archive after merge
`/opsx:archive` SHALL run only on a follow-up branch that is not `main`, only after the latest `pr` block is `MERGED`, merge the delta specs into `openspec/specs/` and move the change folder to `openspec/changes/archive/`.

Traces: DEV-1005-AC-2

#### Scenario: Archive requires a merged pull request and a follow-up branch [NFR-MNT-001]
- **WHEN** the archive command file is read
- **THEN** it stops on `main` and requires the latest `pr` block to be `MERGED`

#### Scenario: Archive syncs specs before moving the change [NFR-MNT-001]
- **WHEN** the archive command file is read
- **THEN** it syncs the delta specs first and then moves the change folder into `openspec/changes/archive/`

### Requirement: Command documentation
`docs/workflow.md` SHALL explain every stage, every `/opsx:*` command and top-level command, the gates, the traceability chain and the branch and commit conventions, and the checker SHALL fail when a command file has no entry in the document.

Traces: DEV-1005-AC-3

#### Scenario: Every command documented [NFR-MNT-001]
- **WHEN** the checker compares the command files with `docs/workflow.md` and each one is documented
- **THEN** it reports no finding

#### Scenario: Undocumented command fails and is named [NFR-MNT-001]
- **WHEN** a command file has no entry in `docs/workflow.md`
- **THEN** the checker reports the command by name

#### Scenario: Committed repository passes the checker [NFR-MNT-001]
- **WHEN** the checker runs on the committed commands and `docs/workflow.md`
- **THEN** it reports no finding

#### Scenario: Checker exits 1 for an undocumented command [NFR-MNT-001]
- **WHEN** the checker runs as a command on a repository with an undocumented command file
- **THEN** it exits 1 and names the command

### Requirement: Review gate before pull request
`/create-pr` SHALL refuse a change unless the latest `review` block in its `handoff.md` is `PASS`.

Traces: DEV-1005-AC-3

#### Scenario: Latest review pass allowed [NFR-MNT-001]
- **WHEN** the latest `review` block is `PASS`
- **THEN** the review gate allows the pull request

#### Scenario: Latest review fail refused [NFR-MNT-001]
- **WHEN** the latest `review` block is `FAIL`
- **THEN** the review gate refuses

#### Scenario: Missing review refused [NFR-MNT-001]
- **WHEN** the handoff has no `review` block or no file exists
- **THEN** the review gate refuses
