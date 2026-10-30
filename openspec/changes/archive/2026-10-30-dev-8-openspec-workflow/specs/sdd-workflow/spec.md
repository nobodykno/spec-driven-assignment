## ADDED Requirements

### Requirement: Approval gate before implementation
`/sdd:apply` SHALL refuse to implement a change unless its `proposal.md` contains `Status: Approved` and non-empty `Approved-by:` and `Approved-on:`. `scripts/check-workflow.mjs` SHALL expose this rule as a tested function.

#### Scenario: Approved change passes [NFR-MNT-001]
- **WHEN** the proposal has `Status: Approved`, a filled `Approved-by:` and `Approved-on:`
- **THEN** the gate allows implementation

#### Scenario: Draft change refused [NFR-MNT-001]
- **WHEN** the proposal has `Status: Draft`
- **THEN** the gate refuses and names the missing approval

#### Scenario: Approved without approver refused [NFR-MNT-001]
- **WHEN** the proposal has `Status: Approved` but an empty `Approved-by:` or `Approved-on:`
- **THEN** the gate refuses

### Requirement: Archive command
`/sdd:archive` SHALL run the native archive so the delta specs merge into `openspec/specs/` and the change folder moves to `openspec/changes/archive/`, and SHALL refuse a change that is not verified.

#### Scenario: Verified change archived [NFR-MNT-001]
- **WHEN** `/sdd:archive` runs on a verified change
- **THEN** its specs exist under `openspec/specs/` and the folder is under `openspec/changes/archive/`

#### Scenario: Unverified change refused [NFR-MNT-001]
- **WHEN** `/sdd:archive` runs on a change without a passing `verification.md`
- **THEN** it stops and archives nothing

### Requirement: Workflow documentation
`docs/workflow.md` SHALL explain every stage, every `/sdd:*` command, the approval gate, the traceability chain and the branch/commit conventions. The checker SHALL fail when a command file has no entry in the document.

#### Scenario: Every command documented [NFR-MNT-001]
- **WHEN** the checker compares `.claude/commands/sdd/*.md` with `docs/workflow.md`
- **THEN** it exits 0 only if each command is documented

#### Scenario: Undocumented command fails [NFR-MNT-001]
- **WHEN** a command file has no entry in `docs/workflow.md`
- **THEN** the checker exits 1 and names the command

### Requirement: All specs validate
WHEN `openspec validate --strict` runs on the repository, all specs SHALL pass.

#### Scenario: Strict validation passes [NFR-MNT-001]
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** it exits 0
