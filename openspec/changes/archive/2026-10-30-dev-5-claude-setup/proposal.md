Ticket: DEV-5
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 15:01 IST

# Proposal: DEV-5 Claude Code setup

> Jira issue `DEV-5` is titled "[DEV-1002] Claude Code setup — skills, hooks, permissions and project
> instructions". The assignment ID is **DEV-1002** (key map in `docs/mcp-setup.md`). Both mean the
> same ticket.

## Why

The agent already works in this repo with a root `CLAUDE.md`, a permission file and Git hooks
(DEV-1). Nothing stops the agent itself from running a destructive command, reading a `.env` file or
pushing to `main`, though: those rules exist only as text. Edited files are only formatted at commit
time, and the recurring patterns (endpoint, migration, Zod contract) that DEV-1006 onwards repeat
many times are not written down as reusable skills. This ticket turns the rules into enforced
guardrails and repeatable patterns before the feature work starts (Assignment Rule 8).

## FRS requirements covered

Workflow tickets are specified in their OpenSpec change, not in the FRS (FRS §5).

| ID | Coverage |
| --- | --- |
| NFR-SEC-005 | PreToolUse hook blocks reading `.env` files and printing the environment; secrets never reach the agent's context, logs or commits |
| NFR-MNT-001 | PostToolUse hook formats and lints every file the agent edits; skills and nested `CLAUDE.md` keep new code consistent with the SDS layering and `docs/CODING_GUIDELINES.md` |
| Assignment Rule 8 | Project instructions, permissions, hooks and skills for the coding agent |

## SDS sections followed / changed

- **Followed:** §3 Repository structure (`.claude/hooks/`), §3.1 Service internal layering,
  §5.4 Migrations, §5.5 Transactions, §6.1 API conventions, §6.4 Error codes, §7.4 Secrets,
  §10 Error handling, §11 Testing strategy.
- **Changed:** none.

## What Changes

- **PreToolUse guard hook** (`.claude/hooks/pre-tool-guard.mjs`): blocks, with a message and
  exit code 2:
  - `rm -rf` (any recursive + force combination)
  - `git push --force` / `-f` / `--force-with-lease` / `+refspec`
  - any `git push` whose destination is `main` (`git push origin main`, `HEAD:main`, or a plain
    `git push` while on `main`)
  - `git commit|push --no-verify` (CLAUDE.md: never bypass Git hooks)
  - `printenv` and bare `env`
  - `docker compose down -v` / `--volumes`
  - reading a `.env` file: shell commands that name a `.env` / `.env.*` file (except
    `.env.example`), and the Read, Edit, Write, Grep and Glob tools on such paths
- **PostToolUse format hook** (`.claude/hooks/post-edit-format.mjs`): after Edit/Write on a
  `ts/tsx/js/mjs/cjs/json/yaml` file, runs Prettier `--write` and ESLint `--fix` on that file. Remaining
  ESLint errors are reported back to the agent (exit 2) so it fixes them in the same turn.
- **`.claude/settings.json`:** `defaultMode: default`; hooks registered; `ask` also covers
  `pnpm add`/`remove`/`install` and `gh pr merge`; the deny list is kept. Any `docker` command that
  is not one of the already-approved `docker compose stop/start/up/exec/logs/ps` falls through to
  the default prompt.
- **Settings checker** (`scripts/check-claude-settings.mjs`, part of `pnpm lint`): fails on
  malformed permission rules (unknown shape, `:*` not at the end, duplicate or contradictory
  entries) and on hook commands that point to missing files.
- **Skills** (`.claude/skills/`): `express-endpoint` (route → controller → service, Zod
  validation, AppError, Supertest test named with the FRS ID), `sequelize-migration` (new
  `.cjs` migration, never edit an applied one, up/down, run and undo locally), `zod-contract`
  (schema in `@app/shared`, inferred types, tests first).
- **Nested instructions:** `services/CLAUDE.md` (layering, errors, tests, migrations) and
  `apps/web/CLAUDE.md` (components, data fetching, kebab-case files, RTL tests). Root
  `CLAUDE.md` points to them and to the hooks and skills.
- **Workflow fixes found while starting this ticket:**
  - `.claude/commands/sdd/*.md` use `$1`/`$2`, but this Claude Code version numbers command
    arguments from `$0`, so `/sdd:run DEV-5 claude-setup` rendered "Ticket: claude-setup". All
    `sdd` commands switch to `$0`/`$1`.
  - `/sdd:run` stage d archives the change on the feature branch **before** the merge, so the
    archive arrives on `main` through the PR. Nothing is pushed to `main` directly any more, so the
    hook can block every push to `main`. The CLAUDE.md "archive commit on main" exception is
    removed.
- **Docs:** `docs/claude-setup.md` explains every item and records the hook tests and manual
  checks with results.

## Capabilities

### New Capabilities
- `agent-guardrails`: what the coding agent is prevented from doing, what needs a human's
  approval, how edited files are formatted, and how the permission configuration is validated.
- `agent-skills`: the reusable project skills and layer-specific instructions the agent follows
  when adding endpoints, migrations and shared contracts.

### Modified Capabilities
- None. `quality-gates` and `git-hooks` keep their requirements; `pnpm lint` only gains one more
  check, which is covered by the new `agent-guardrails` capability.

## Affected packages / services

Root workspace (`.claude/`, `CLAUDE.md`, `scripts/`, `eslint.config.js`, `.prettierignore`,
`package.json` scripts) · `services/CLAUDE.md` · `apps/web/CLAUDE.md` · `docs/`. No application
code changes.

## New / changed dependencies (exact versions)

None. The hooks and the settings checker are dependency-free Node scripts; formatting uses the
Prettier 3.9.10 and ESLint 10.13.0 already pinned in DEV-1.

## Database changes

None. The `sequelize-migration` skill is demonstrated with a throwaway migration that is run and
undone locally and never committed.

## Ticket dependencies

DEV-1 (DEV-1001) Project setup — **Done** (Jira status Done, PR #1 merged).

## Rollback plan

All work is on `feature/DEV-5-claude-setup`, one commit per task.
- **Before merge:** delete the branch.
- **After merge:** `git revert` the merge commit. Removing the `hooks` block from
  `.claude/settings.json` disables the hooks immediately; no data or schema is involved.

## Impact

- **Agent behaviour:** blocked commands now fail with a message instead of running. Edited files
  are formatted immediately. A push to `main` is impossible for the agent.
- **Workflow:** `/sdd:run` stage d order changes (archive before merge). Humans can still push to
  `main`; the hooks apply only to the agent's tool calls.
- **No runtime or API impact.**
