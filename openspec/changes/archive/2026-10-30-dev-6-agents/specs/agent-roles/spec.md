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

### Requirement: Agents follow the token-efficiency policy
The repository SHALL keep a token-efficiency policy in `docs/token-policy.md`, linked from a "Token efficiency (mandatory)" section in `CLAUDE.md`. Every `sdd` command and every agent SHALL reference it, the reviewer SHALL check compliance, build output and lock files SHALL be denied to `Read`, and each ticket's token use SHALL be recorded before checkpoint B.

#### Scenario: Policy referenced everywhere [NFR-MNT-001]
- **WHEN** `node scripts/check-agents.mjs` runs on the committed files
- **THEN** it finds `docs/token-policy.md`, the line "Follow docs/token-policy.md" in every agent file and in `sdd/{propose,apply,verify,ship,run}.md`, and exits 0

#### Scenario: Missing policy reference fails the checker [NFR-MNT-001]
- **WHEN** an agent file or an `sdd` command lacks the line "Follow docs/token-policy.md", or `docs/token-policy.md` is missing
- **THEN** the checker exits 1 and names the file

#### Scenario: Build output and lock files are not read [NFR-MNT-001]
- **WHEN** the agent tries to read `node_modules/**`, `**/dist/**`, `coverage/**` or `pnpm-lock.yaml`
- **THEN** the permission deny rules refuse the read, and `node scripts/check-claude-settings.mjs` still exits 0

#### Scenario: Reviewer checks policy compliance [NFR-MNT-001]
- **WHEN** the reviewer reviews a change
- **THEN** its checklist asks whether the implementation session followed the token policy, and it notes whole-file or whole-doc reads that were not needed

#### Scenario: Token use recorded per ticket [NFR-MNT-001]
- **WHEN** a ticket reaches checkpoint B
- **THEN** the user has been asked to run `/cost`, and `docs/progress.md` and the `docs/token-efficiency.md` table have a row for the ticket with model, tokens/cost, files read, fix rounds and policy violations

#### Scenario: Measurement missing [NFR-MNT-001]
- **WHEN** the user has not pasted `/cost` numbers
- **THEN** the row says "not provided" for tokens/cost instead of an estimate, and checkpoint B lists it as open
