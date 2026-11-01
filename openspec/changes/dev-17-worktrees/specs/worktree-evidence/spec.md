## ADDED Requirements

### Requirement: Worktree commands documented

`docs/worktrees.md` SHALL contain a "Commands" section with, for each of the pairs DEV-1007 || DEV-1008 and DEV-1011 || DEV-1012, the exact `git worktree add` commands that created the pair's worktrees, and the section SHALL also show `git worktree list` and `git worktree remove`.

Traces: DEV-1014-AC-1

#### Scenario: Commands for both pairs documented [DEV-1014-AC-1]

- **WHEN** the worktree log check reads a "Commands" section that has a subsection for each of the two pairs, each with two `git worktree add` lines naming the pair's branches, plus a `git worktree list` line and a `git worktree remove` line
- **THEN** it reports no finding

#### Scenario: Missing remove command rejected [DEV-1014-AC-1]

- **WHEN** the check reads a "Commands" section without any `git worktree remove` line
- **THEN** it reports a finding that names `git worktree remove`

#### Scenario: Pair without its add commands rejected [DEV-1014-AC-1]

- **WHEN** the check reads a "Commands" section whose DEV-1011 || DEV-1012 subsection has fewer than two `git worktree add` lines
- **THEN** it reports a finding that names the pair DEV-1011 || DEV-1012

### Requirement: Merge conflict resolved and re-verified

`docs/worktrees.md` SHALL contain a "Merge conflicts" section with at least one conflict entry that names the conflicted file, the resolution, and the quality-gate command and result run after the merge.

Traces: DEV-1014-AC-2

#### Scenario: Conflict with resolution and gates recorded [DEV-1014-AC-2]

- **WHEN** the check reads a "Merge conflicts" table row with a file path, a resolution and a re-verification cell that contains a `pnpm` command and a result
- **THEN** it reports no finding

#### Scenario: Conflict without re-verification rejected [DEV-1014-AC-2]

- **WHEN** the check reads a conflict row whose re-verification cell is empty or holds no `pnpm` command
- **THEN** it reports a finding that names the file of that row

#### Scenario: Conflicts section without an entry rejected [DEV-1014-AC-2]

- **WHEN** the check reads a "Merge conflicts" section whose table has no data row
- **THEN** it reports a finding that no conflict is recorded

### Requirement: Contract approval referenced by commit

`docs/worktrees.md` SHALL contain a "Shared contracts approved before parallel work" section with one row per pair that gives the commit SHA of the approved shared contract, and each SHA SHALL exist in the repository.

Traces: DEV-1014-AC-3

#### Scenario: Approval commit recorded per pair [DEV-1014-AC-3]

- **WHEN** the check reads one row per pair, each with a 7 to 40 character hexadecimal SHA that the commit lookup confirms
- **THEN** it reports no finding

#### Scenario: Row without commit reference rejected [DEV-1014-AC-3]

- **WHEN** the check reads a pair row whose commit cell holds no hexadecimal SHA
- **THEN** it reports a finding that names the pair

#### Scenario: Reference to unknown commit rejected [DEV-1014-AC-3]

- **WHEN** the check reads a pair row whose SHA the commit lookup does not find
- **THEN** it reports a finding that names the pair and the SHA

### Requirement: Integration evidence recorded

`docs/worktrees.md` SHALL contain an "Evidence" section with a `git log --graph` excerpt that shows at least one merge commit, and a terminal output block of `git worktree list` that lists at least two worktrees.

Traces: DEV-1014-AC-4

#### Scenario: Graph excerpt and terminal output present [DEV-1014-AC-4]

- **WHEN** the check reads an "Evidence" section with a fenced `git log --graph` block that has graph lines and a merge commit, and a fenced `git worktree list` output block with two worktree paths
- **THEN** it reports no finding

#### Scenario: Graph excerpt without a merge commit rejected [DEV-1014-AC-4]

- **WHEN** the check reads an "Evidence" graph block that has no merge commit line
- **THEN** it reports a finding that the excerpt shows no merge

#### Scenario: Evidence without terminal output rejected [DEV-1014-AC-4]

- **WHEN** the check reads an "Evidence" section with no `git worktree list` output block
- **THEN** it reports a finding that terminal output is missing

### Requirement: Worktree log checked in lint

The repository SHALL run the worktree log check as `check:worktree-docs` in the `lint` chain, and the check SHALL exit 1 and print every finding when `docs/worktrees.md` fails it.

Traces: DEV-1014-AC-1, DEV-1014-AC-2, DEV-1014-AC-3, DEV-1014-AC-4

#### Scenario: Repository worktree log passes the check [DEV-1014-AC-4]

- **WHEN** the check runs on the real `docs/worktrees.md` with the real git commit lookup
- **THEN** it reports no finding

#### Scenario: Lint chain runs the worktree check [DEV-1014-AC-4]

- **WHEN** the test reads the `lint` script of `package.json`
- **THEN** it contains `pnpm check:worktree-docs` and the `check:worktree-docs` script runs `node scripts/check-worktree-docs.mjs`

#### Scenario: Findings make the CLI exit 1 [DEV-1014-AC-2]

- **WHEN** the CLI runs on a log with a conflict row that lacks re-verification
- **THEN** it prints the finding and exits 1, and it exits 0 and prints a success line for a valid log
