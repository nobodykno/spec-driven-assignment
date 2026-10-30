# Subagents

Four project subagents split the work on a ticket so that writing code, writing tests, reviewing
and coordinating are done by different agents with different limits (DEV-6 / DEV-1003,
Assignment Rules 6, 7 and 23). The definitions live in `.claude/agents/`; every agent follows
`docs/token-policy.md`.

How the limits are enforced:

- **`tools` in the frontmatter** lists what each agent may use. The Claude Code docs do not say that
  `Bash(...)` specifiers in a subagent's `tools` restrict Bash (DEV-6 design, "Docs checked"), so
  they document intent only.
- **Agent scope guard** (`.claude/hooks/agent-scope-guard.mjs`) is registered as a `PreToolUse`
  hook in each agent's frontmatter with `--agent <name>`. It runs only while that agent is active,
  in addition to the global DEV-5 guard, and blocks with exit code 2. It is an allowlist for the
  reviewer, test-writer and coordinator.
- **Agent checker** (`scripts/check-agents.mjs`, part of `pnpm lint`) fails when an agent is missing,
  has a tool outside its allowed set, lacks its guard hook or the token-policy line, or when this
  file no longer matches the frontmatter.

Frontmatter hooks of project agents run only after the workspace trust dialog has been accepted.

| Agent | Writes | Used by |
| --- | --- | --- |
| implementer | production code and tests of an approved change; local commits | `/sdd:apply` |
| test-writer | test files only | `/sdd:apply` (test-first step) |
| reviewer | nothing | `/sdd:verify` |
| coordinator | `docs/progress.md`, `docs/worktrees.md` | `/sdd:run` (planning, `[PARALLEL]` pairs) |

## implementer

### Scope
Implements the tasks it is given from an approved OpenSpec change: failing test first (name starts
with the FRS ID), minimum code to pass, the task's verification command, tick the task, one local
commit per task.

### Permitted actions
- `Read`, `Grep`, `Glob`, `Edit`, `Write`, `MultiEdit`, `Skill` (project skills such as
  `express-endpoint`)
- `Bash(pnpm:*)` for tests, lint, typecheck and build
- `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)`
- Read-only Atlassian MCP tools (get/search) if they are available to it

### Output
Tasks done with commit hashes, verification command → result per task, problems or deviations.

### Restrictions
- Guard: every Edit/Write is blocked unless the current branch's change
  (`feature/<KEY>-<name>` → `openspec/changes/<key>-<name>/proposal.md`) has `Status: Approved`,
  `Approved-by` and `Approved-on`.
- Guard: `git push` (also inside `bash -c` and `$(...)`), any `gh` call and Atlassian MCP write
  tools are blocked. A commit message that contains the words "git push" is a known false positive.
- No dependency outside the approved proposal, no edits to applied migrations, no `.env` access
  (global guard).

### When used
`/sdd:apply`, for a task or a group of tasks, after the test-writer has written the failing tests
(or for tasks with no spec scenario, such as configuration).

## test-writer

### Scope
Writes failing tests from the spec scenarios of a change. At least one test per scenario; each name
starts with the scenario's FRS ID. Confirms that the tests fail for the expected reason.

### Permitted actions
- `Read`, `Grep`, `Glob`, `Skill`
- `Edit`, `Write` on test files only: `*.test.*`, `*.spec.*`, files under `e2e/`
- `Bash(pnpm:*)` limited by the guard to test, lint, typecheck and build runs and
  `pnpm exec vitest` / `playwright`
- `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)` (and `git show`)

### Output
Table FRS ID → scenario → test file → test name, the failure reason per file, scenarios without a
test.

### Restrictions
- Refuses requests to change production code; the guard blocks Edit/Write on any other path
  (rule `production-code`) and on paths outside the project.
- Guard allowlist for Bash: no `sed -i`, redirections to files, `git commit`, `git checkout`,
  `pnpm add`, `pnpm format`, `node -e` or command substitution.
- No MCP tools.

### When used
`/sdd:apply`, at the start of each task group, before the implementer.

## reviewer

### Scope
Independent review of `git diff main...HEAD` against the approved change, `docs/FRS.md`,
`docs/SDS.md`, `CLAUDE.md`, `docs/CODING_GUIDELINES.md` and `docs/token-policy.md`. Treats any
summary it is given as a claim and checks the diff and the tests itself.

### Permitted actions
- `Read`, `Grep`, `Glob`
- `Bash(git diff:*)`, `Bash(git log:*)` (the guard also allows `git show` and `git status`)

### Output
Fixed format: `Verdict: APPROVE | CHANGES REQUIRED`, findings table (severity, `file:line`, issue,
suggested fix), requirements without tests, not verifiable.

### Restrictions
- Guard: Edit, Write, MultiEdit and NotebookEdit are blocked; every Bash command other than
  read-only git is blocked; no MCP tools.
- Never runs at the same time as another reviewer on the same change (token policy).
- Gets only the change folder, the diff and the relevant FRS IDs, not the implementer's summary.

### When used
`/sdd:verify`, in a session that did not implement the change; up to three rounds per ticket.

## coordinator

### Scope
Plans the task order of a change (contracts → database → services → web; tests before code; gates
last), says which tasks go to the test-writer and which to the implementer, splits `[PARALLEL]`
pairs into one worktree per ticket with the exact commands, and records status.

### Permitted actions
- `Read`, `Grep`, `Glob`
- `Edit` on `docs/progress.md` and `docs/worktrees.md` only
- `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git branch:*)` (list only),
  `Bash(git worktree list:*)`
- `Bash(openspec:*)` limited by the guard to `list`, `status`, `show`, `validate`, `instructions`

### Output
Plan table (task, agent, depends on, worktree), commands for the main session, risks and conflicts,
status rows recorded.

### Restrictions
- Writes no code: the guard blocks Edit/Write on every other file.
- Does not run `git worktree add`, merges, commits, pushes, tests, `openspec archive` or MCP calls;
  the main session runs the commands it plans.

### When used
`/sdd:run` before apply for multi-group changes, and for the `[PARALLEL]` pairs DEV-10 + DEV-11 and
DEV-14 + DEV-15.

## Checks

Results of the DEV-6 checks (task 5). The automated tests are in
`.claude/hooks/agent-scope-guard.test.mjs` and `scripts/check-agents.test.mjs`.

| # | Check | Result |
| --- | --- | --- |
| 1 | `/agents` lists implementer, test-writer, reviewer, coordinator | ✅ 2026-10-30: after restarting the session all four appear as agent types (implementer, test-writer, coordinator listed as new; reviewer kept). The human confirms the `/agents` menu at checkpoint B. |
| 2 | test-writer asked to change production code refuses; forced edit blocked | ✅ refused: "I only write tests. The implementer changes production code." It also declined the forced Edit, so the hook block is shown by the guard CLI test (exit 2, `production-code`). |
| 3 | reviewer given only a summary inspects the diff, edits nothing | ✅ given only a one-line summary, it read `git diff` itself and cited `file:line` (found a real push bypass, fixed in 099844b); `git status` empty afterwards. Output had Verdict / Findings / Requirements without tests. |
| 4 | implementer: edit on an unapproved change blocked; `git push` blocked | ✅ on scratch branch `feature/DEV-999-scratch`: Edit blocked, "Blocked by .claude/hooks/agent-scope-guard.mjs (not-approved)". It refused to run `git push` (policy); the push block is covered by 18 guard tests. |
| 5 | coordinator plans DEV-10 + DEV-11 without code edits | ✅ two-worktree plan with commands, shared-file conflicts and integration order; no file edits; declined `git worktree add` (policy). |
| 6 | Read of `pnpm-lock.yaml` refused by the deny rules | ✅ 2026-10-30: Read tool returned "File is in a directory that is denied by your permission settings." |
