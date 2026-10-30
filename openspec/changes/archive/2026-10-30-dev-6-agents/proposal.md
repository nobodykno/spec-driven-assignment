Ticket: DEV-6
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 16:33 IST

# Proposal: DEV-6 Autonomous agents

> Jira issue `DEV-6` is titled "[DEV-1003] Autonomous agents — implementation, testing, independent
> review and coordination". The assignment ID is **DEV-1003** (key map in `docs/mcp-setup.md`).
> Both mean the same ticket.

## Why

Today one agent session plans, writes code, writes tests and ships. Only the `reviewer` subagent
(DEV-5) is separate. Nothing stops a test writer from "fixing" production code to make a test
pass, or an implementer from pushing or moving a Jira ticket. This ticket splits the work into four
subagents with narrow, enforced responsibilities (Assignment Rules 6, 7 and 23), so that writing,
testing, reviewing and coordinating are separate and each limit is checked, not only described.

## FRS requirements covered

Workflow tickets are specified in their OpenSpec change, not in the FRS (FRS §5).

| ID | Coverage |
| --- | --- |
| NFR-MNT-001 | Agent definitions are validated by `pnpm lint`; agent-scoped hooks keep each agent inside its scope |
| NFR-TST-001 | The test-writer writes tests named with the FRS ID from spec scenarios; the reviewer reports requirements without tests |
| Assignment Rules 6, 7, 23 | Specialised subagents with limited responsibilities; independent review; coordination of task order and `[PARALLEL]` worktrees |

## SDS sections followed / changed

- **Followed:** §3 Repository structure (`.claude/`), §11 Testing strategy (test naming, test-first).
- **Changed:** none.

## What Changes

- **Four subagents** in `.claude/agents/`:
  - `implementer.md`: implements tasks of an **approved** change only. Edit, Write, Read, search and
    `pnpm` test/lint/build tools. No `git push`, no `gh pr`, no Jira writes.
  - `test-writer.md`: writes failing tests from spec scenarios, names start with the FRS ID. May
    create or edit test files only (`*.test.*`, `*.spec.*`, `e2e/`); refuses production code.
  - `reviewer.md` (exists, DEV-5): stays read-only. Updated so it always reads `git diff main...HEAD`
    and the tests itself, even when given only a summary, and always reports verdict, findings and
    requirements without tests.
  - `coordinator.md`: reads the change and plans task order, splits `[PARALLEL]` tickets into
    worktrees (commands only, per `/sdd:run`), tracks status in `docs/progress.md` and
    `docs/worktrees.md`. Writes no code.
- **Agent scope guard** (`.claude/hooks/agent-scope-guard.mjs`, test-first): a PreToolUse hook
  registered in each agent's frontmatter. It enforces per agent:
  - test-writer: Edit/Write only on test paths.
  - coordinator: Edit/Write only on `docs/progress.md` and `docs/worktrees.md`.
  - implementer: blocks `git push`, `gh pr`, Jira write tools, and any Edit/Write while no change
    in `openspec/changes/` for the current branch's ticket is `Status: Approved`.
  - Unknown agent or malformed input: fail closed (exit 2).
- **Agent checker** (`scripts/check-agents.mjs`, part of `pnpm lint`, test-first): fails when one
  of the four agents is missing, the frontmatter `name` differs from the file name, the
  description is empty, a tool is outside that agent's allowed set (e.g. reviewer with Edit, any
  agent with `Bash(git push:*)`), or a referenced hook script does not exist.
- **Docs:** `docs/agents.md`: per agent its scope, permitted tools/actions, expected output,
  restrictions and when it is used, plus live check results. `docs/claude-setup.md` and `CLAUDE.md`
  link to it. `/sdd:apply` and `/sdd:run` say when each agent is used.
- **Token-efficiency policy** (added by `/opsx:update` after the first approval, at the user's
  request; first approval 2026-10-30 16:10 IST, tasks 1.1–2.2 were done under it):
  - `docs/token-policy.md` covers reading, commands, sessions and agents, models, and MCP.
    `CLAUDE.md` gets a short "Token efficiency (mandatory)" section that links to it. It replaces
    the longer "Token efficiency" section from commit 057b344.
  - **Enforced:**
    - The line "Follow docs/token-policy.md" goes at the top of `.claude/commands/sdd/{propose,apply,verify,ship,run}.md`
      and every `.claude/agents/*.md`. The agent checker fails when the line is missing.
    - The reviewer checklist gains a token-policy item.
    - `.claude/settings.json` denies `Read` on `node_modules`, `dist`, `coverage` and
      `pnpm-lock.yaml`. These rules are already in commit 057b344 and are kept.
  - **Measured:**
    - Before checkpoint B of every ticket, the agent asks the user to run `/cost` and paste the
      numbers.
    - The agent records the ticket, model, tokens/cost, files read, fix rounds and policy
      violations in `docs/progress.md`.
    - `docs/token-efficiency.md` keeps a table with one row per ticket. DEV-18 adds the formal
      baseline vs graph-assisted comparison.

## Capabilities

### New Capabilities
- `agent-roles`: the specialised subagents, what each may and may not do, how their limits are
  enforced and checked, how they are documented, and the token-efficiency policy every session
  and agent follows.

### Modified Capabilities
- None. `agent-guardrails` (global guard hook) is unchanged; the new guard is agent-scoped and
  runs in addition to it.

## Affected packages / services

Root workspace only: `.claude/agents/`, `.claude/hooks/`, `scripts/`, `package.json` (`lint`
script), `.claude/settings.json` (deny rules), `CLAUDE.md`,
`.claude/commands/sdd/{propose,apply,verify,ship,run}.md`, `docs/` (`agents.md`,
`token-policy.md`, `token-efficiency.md`, `progress.md`). No application code changes.

## New / changed dependencies (exact versions)

None. The guard and checker are dependency-free Node scripts, tested with the Vitest already pinned.

## Database changes

None.

## Ticket dependencies

DEV-5 (DEV-1002) Claude Code setup — **Done** (Jira status Done, PR #2 merged).

## Rollback plan

All work is on `feature/DEV-6-agents`, one commit per task.
- **Before merge:** delete the branch.
- **After merge:** `git revert` the merge commit. Deleting a file in `.claude/agents/` removes that
  agent; no data or schema is involved.

## Impact

- **Agent behaviour:** subagents can be delegated work with enforced limits. The main session is
  unchanged and still bound by the DEV-5 guardrails.
- **Workflow:** `/sdd:apply` may delegate test writing to `test-writer` and implementation to
  `implementer`; `/sdd:verify` keeps using `reviewer`; `/sdd:run` may use `coordinator` for
  `[PARALLEL]` pairs.
- **Every ticket from now on:**
  - Sessions follow `docs/token-policy.md`.
  - Before checkpoint B the user is asked to run `/cost`.
  - Model choice: Sonnet by default. Opus only for DEV-9 and DEV-20, after the agent tells the
    user to switch with `/model`.
- **No runtime or API impact.**
