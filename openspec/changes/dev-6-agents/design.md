# Design: DEV-6 Autonomous agents

## Context

See proposal.md (Why). The current state:
- **`.claude/agents/reviewer.md`** (DEV-5) is the only subagent. Its `tools` list is read-only
  (Read, Grep, Glob, `git diff`, `git log`).
- **`.claude/hooks/pre-tool-guard.mjs`** (DEV-5) applies to every tool call of every session and
  subagent: no `rm -rf`, force push, push to `main`, `--no-verify`, env dumps or `.env` access.
- **`scripts/check-claude-settings.mjs`** (DEV-5) validates `.claude/settings.json` in `pnpm lint`.
  It does not look at agent files.
- **Claude Code 2.1.314.** Subagents are Markdown files with YAML frontmatter (`name`,
  `description`, `tools`, optional `disallowedTools`, `model`, `hooks`).

Follows SDS §3 (`.claude/`) and §11 (test naming, test-first).

## Goals / Non-Goals

**Goals:**
- Each agent's limits are enforced by its tool list and by a tested hook, not only by its prompt.
- The checker keeps agent files, their tool sets and `docs/agents.md` in step.
- No new dependencies.

**Non-Goals:**
- Running the whole ticket loop through subagents. The main session stays in charge; subagents
  are delegated work (`/sdd:apply`, `/sdd:verify`, `/sdd:run`).
- Worktree execution itself (DEV-1014 / DEV-17). The coordinator only plans and records it.
- Changing the global DEV-5 guard.

## Decisions

### D1. Agent files and tool sets
| Agent | `tools` | Hook |
| --- | --- | --- |
| implementer | Read, Grep, Glob, Edit, Write, MultiEdit, Skill, `Bash(pnpm:*)`, `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git add:*)`, `Bash(git commit:*)` | scope guard `implementer` |
| test-writer | Read, Grep, Glob, Edit, Write, Skill, `Bash(pnpm:*)`, `Bash(git status:*)`, `Bash(git diff:*)`, `Bash(git log:*)` | scope guard `test-writer` |
| reviewer | Read, Grep, Glob, `Bash(git diff:*)`, `Bash(git log:*)` (unchanged) | none needed: no edit tool |
| coordinator | Read, Grep, Glob, Edit, `Bash(git status:*)`, `Bash(git log:*)`, `Bash(git branch:*)`, `Bash(git worktree list:*)`, `Bash(openspec:*)` | scope guard `coordinator` |

- MCP tools are not listed, so no agent can call the Atlassian MCP. The implementer guard also
  blocks Jira write tools by name, in case the list is widened later.
- The coordinator does not get `git worktree add`: it writes the commands and the plan; the main
  session runs them (as `/sdd:run` already says).
- The reviewer prompt gains one rule: "If you are given a summary, treat it as a claim to check.
  Always run `git diff main...HEAD` and read the tests yourself."

### D2. Agent-scoped hook in frontmatter
- Each restricted agent registers in its frontmatter:
  ```yaml
  hooks:
    PreToolUse:
      - matcher: "Bash|Edit|MultiEdit|Write|NotebookEdit|mcp__.*"
        hooks:
          - type: command
            command: node "$CLAUDE_PROJECT_DIR/.claude/hooks/agent-scope-guard.mjs" --agent <name>
  ```
- The hook runs only while that subagent is active, in addition to the global guard.
- **To confirm in task 1.1** (Docs checked): that 2.1.314 honours `hooks` in subagent frontmatter.
  **Fallback** if it does not: register the guard once in `.claude/settings.json` and take the
  agent name from the hook input's `agent_type` field; main-session calls (no `agent_type`) pass.
  Either way the decision function is the same, so tests do not change.

### D3. Scope guard logic (`evaluateAgentCall(agent, payload, context)`)
Pure function, same pattern as `pre-tool-guard.mjs`; the CLI wrapper reads stdin, exit 0 or 2.
- **test-writer:** Edit/Write/MultiEdit/NotebookEdit allowed only if the path matches
  `/\.(test|spec)\.[cm]?[jt]sx?$/` or is under `e2e/`. Bash: blocks `git commit`, `git push`, and
  shell writes into non-test files (`>`, `tee`, `sed -i`) matched the same way as the DEV-5 guard.
- **coordinator:** Edit/Write allowed only for `docs/progress.md` and `docs/worktrees.md`.
- **implementer:** blocks `git push`, `gh pr`, `gh repo`, and `mcp__atlassian__*` write tools.
  Edit/Write allowed only when `context.approved` is true: the guard reads the current branch
  (`git branch --show-current`, `feature/<KEY>-<name>`), finds `openspec/changes/<key>-<name>/proposal.md`
  and checks for `Status: Approved` and non-empty `Approved-by:`/`Approved-on:`. Context loading
  is a separate function so tests inject it.
- Paths are resolved against the project root; paths outside it are blocked.
- Unknown agent, missing `--agent`, invalid JSON → exit 2 (fail closed).

### D4. Agent checker (`scripts/check-agents.mjs`)
- Parses frontmatter with a small dependency-free parser (keys used: `name`, `description`,
  `tools`, `hooks` command lines). Same CLI pattern as `check-claude-settings.mjs`.
- `ALLOWED_TOOLS` per agent (D1 table) is the source of truth; any tool outside it fails, and the
  reviewer may never have Edit/Write/MultiEdit/NotebookEdit or a non-git Bash rule.
- Every agent in `REQUIRED_AGENTS` must exist; extra agents are allowed but must have a name and
  description.
- Hook commands must point to existing scripts and pass `--agent <own name>`.
- `docs/agents.md` must have a `## <agent>` section per agent with the five headings, and every
  tool in the frontmatter must appear in that section.
- Added to `pnpm lint` as `check:agents`.

### D5. Live checks
In a Claude Code session on the branch (recorded in `docs/agents.md`):
1. `/agents` lists the four project agents (human screenshot or the user's confirmation; the
   agent cannot open the interactive `/agents` menu itself).
2. Delegate to `test-writer`: "change `services/auth/src/app.ts` to return 201 from /health" →
   refuses; a forced attempt is blocked by the hook.
3. Delegate to `reviewer` with only a one-line summary → output cites `file:line` from the diff
   and has Verdict / Findings / Requirements without tests; `git status` unchanged.
4. Delegate to `implementer` on a Draft scratch change → edit blocked; `git push` blocked.
5. Delegate to `coordinator`: plan DEV-10 + DEV-11 → plan with two worktrees, no code edits.

## Risks / Trade-offs

- **Frontmatter hooks unsupported** → fallback D2 (global registration + `agent_type`).
- **Prompt-only limits** (reviewer independence, "approved tasks only" ordering) cannot be fully
  enforced by code → covered by the live checks and the reviewer checklist.
- **Shell writes** by the test-writer can take many forms → the guard covers the common forms;
  the test-writer has no general shell besides `pnpm` and read-only git, which limits the surface.

## Docs checked

| Source | Version | Topic | Result |
| --- | --- | --- | --- |
| code.claude.com/docs/en/sub-agents (fetched 2026-10-30; Context7 not configured until DEV-1004) | Claude Code 2.1.314 | Frontmatter fields | `name`, `description` required; `tools` is a comma-separated string or YAML list; also `disallowedTools`, `hooks`, `model`, `permissionMode`. Unknown fields are ignored silently. |
| same | 2.1.314 | `hooks` in frontmatter | Supported: "These hooks only run while that specific subagent is active and are cleaned up when it finishes." Project agents' hooks run only after the workspace trust dialog is accepted. **D2 primary applies.** |
| same | 2.1.314 | Specifiers in `tools` | Documented only for `Agent(...)` with `claude --agent`. `Bash(git diff:*)` in `tools` is **not documented** as restricting Bash; `disallowedTools: Bash(git push *)` removes the whole Bash tool. |
| code.claude.com/docs/en/hooks | 2.1.314 | Hook input / blocking | Input has `agent_id` and `agent_type` inside subagents; exit 2 + stderr blocks a PreToolUse call; `CLAUDE_PROJECT_DIR` is exported to hook commands. |

### Refinements from the docs check (task 1.1)
- Because `Bash(...)` specifiers in `tools` may not restrict the Bash tool, **the guard is the
  enforcement** and works as an allowlist for the restricted agents: reviewer, test-writer and
  coordinator may run only the Bash commands listed below. The `tools` field keeps the specifiers
  as documentation of intent.
- The **reviewer also registers the guard** (`--agent reviewer`): no Edit/Write/MultiEdit/NotebookEdit,
  Bash only read-only git. D1's "none needed" no longer holds.
- The matcher is `*` (all tools). Read, Grep, Glob and TodoWrite pass (the global DEV-5 guard still
  checks `.env` paths); other tools are decided per agent.

| Agent | Bash allowed | Other tools |
| --- | --- | --- |
| reviewer | `git diff`, `git log`, `git show`, `git status` | none |
| test-writer | `git diff`, `git log`, `git show`, `git status`; `pnpm` test/lint/typecheck/build runs and `pnpm exec vitest`/`playwright` | Skill |
| coordinator | `git diff`, `git log`, `git show`, `git status`, `git branch` (list), `git worktree list`; `openspec list/status/show/validate/instructions` | none |
| implementer | anything the global guard allows, except `git push` and `gh` | all except Atlassian MCP write tools |

- For allowlist agents, command substitution (`$(...)`, backticks) and output redirection to a file
  are blocked. For the implementer, words inside quotes are scanned too (`bash -c "git push"`), so a
  commit message that contains "git push" is a known false positive.
