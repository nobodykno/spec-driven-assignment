## ADDED Requirements

### Requirement: Four specialised subagents
The repository SHALL define the subagents `implementer`, `test-writer`, `reviewer` and `coordinator` in `.claude/agents/<name>.md`, each with a frontmatter `name` equal to the file name, a non-empty `description` saying when it is used, and a `tools` list limited to that agent's allowed set. `pnpm lint` SHALL fail when any of this does not hold.

#### Scenario: Agents are listed [NFR-MNT-001]
- **WHEN** `/agents` is opened in a Claude Code session on this repository
- **THEN** implementer, test-writer, reviewer and coordinator are listed as project agents

#### Scenario: Valid definitions pass the checker [NFR-MNT-001]
- **WHEN** `node scripts/check-agents.mjs` runs on the committed agent files
- **THEN** it exits 0

#### Scenario: Broken definition fails the checker [NFR-MNT-001]
- **WHEN** an agent file is missing, its `name` differs from the file name, its description is empty, or it lists a tool outside its allowed set (e.g. reviewer with `Edit`, any agent with `Bash(git push:*)`)
- **THEN** the checker exits 1 and names the file and the problem

### Requirement: Implementer works on approved changes only
The `implementer` agent SHALL implement tasks of an approved OpenSpec change, test first, and SHALL NOT push, open or merge pull requests, or write to Jira. An agent-scoped hook SHALL block those actions, and SHALL block Edit/Write while the current branch's change is not `Status: Approved`.

#### Scenario: Edits allowed on an approved change [NFR-MNT-001]
- **WHEN** the implementer edits a file on a branch whose change proposal has `Status: Approved`
- **THEN** the hook allows the edit

#### Scenario: Edits blocked on an unapproved change [NFR-MNT-001]
- **WHEN** the implementer edits a file on a branch whose change is `Status: Draft` or has no change
- **THEN** the hook blocks the call (exit 2) with a message that the change is not approved

#### Scenario: Push and Jira writes blocked [NFR-MNT-001]
- **WHEN** the implementer runs `git push`, `gh pr create`, `gh pr merge` or a Jira write tool
- **THEN** the hook blocks the call (exit 2) and names the action

### Requirement: Test-writer writes tests only
The `test-writer` agent SHALL write tests from spec scenarios, each test name starting with the FRS ID of its scenario, and SHALL NOT create or change production code. An agent-scoped hook SHALL allow Edit/Write only on test paths (`*.test.*`, `*.spec.*`, files under `e2e/`).

#### Scenario: Test file edit allowed [NFR-TST-001]
- **WHEN** the test-writer writes `services/auth/src/login.test.ts`
- **THEN** the hook allows it

#### Scenario: Production code change refused [NFR-TST-001]
- **WHEN** the test-writer is asked to change production code, e.g. `services/auth/src/app.ts`
- **THEN** it refuses, and if it tries anyway the hook blocks the call (exit 2)

### Requirement: Reviewer is independent and read-only
The `reviewer` agent SHALL have no tool that edits files, SHALL inspect `git diff main...HEAD` and the tests itself, and SHALL report a verdict, findings and the requirements without tests.

#### Scenario: Reviewer reports without editing [NFR-TST-001]
- **WHEN** the reviewer runs on a branch
- **THEN** no file changes (`git status` unchanged) and the output contains `Verdict`, `Findings` and `Requirements without tests`

#### Scenario: Summary alone is not trusted [NFR-TST-001]
- **WHEN** the reviewer is given only the implementer's summary of the work
- **THEN** it still reads the actual diff and tests, and its findings cite files and lines from the diff

### Requirement: Coordinator plans and tracks without writing code
The `coordinator` agent SHALL plan the task order of a change, split `[PARALLEL]` tickets into one worktree per ticket, and track status in `docs/progress.md` and `docs/worktrees.md`. An agent-scoped hook SHALL allow Edit/Write only on those two files.

#### Scenario: Status file update allowed [NFR-MNT-001]
- **WHEN** the coordinator edits `docs/progress.md`
- **THEN** the hook allows it

#### Scenario: Code change blocked [NFR-MNT-001]
- **WHEN** the coordinator tries to edit `services/tracker/src/app.ts`
- **THEN** the hook blocks the call (exit 2)

### Requirement: Scope guard fails closed
The agent scope guard SHALL block a call when the agent name is unknown or the hook input is malformed.

#### Scenario: Known agent and valid input are evaluated [NFR-MNT-001]
- **WHEN** the guard receives a valid PreToolUse payload with `--agent test-writer` for a Read call
- **THEN** it exits 0

#### Scenario: Malformed input blocked [NFR-MNT-001]
- **WHEN** the guard receives invalid JSON or an unknown agent name
- **THEN** it exits 2 with a message

### Requirement: Agent documentation
`docs/agents.md` SHALL document, for each of the four agents, its scope, permitted tools and actions, expected output, restrictions and when it is used, and record the live checks.

#### Scenario: Documentation complete [NFR-MNT-001]
- **WHEN** `docs/agents.md` is read
- **THEN** it has a section per agent with the headings Scope, Permitted actions, Output, Restrictions and When used, and a checks table with results

#### Scenario: Documentation out of date fails the checker [NFR-MNT-001]
- **WHEN** an agent's frontmatter lists a tool that its `docs/agents.md` section does not mention, or a section is missing
- **THEN** the agent checker exits 1 and names the agent and the tool or section
