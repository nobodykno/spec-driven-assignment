# Design: DEV-5 Claude Code setup

## Context

See proposal.md (Why). The current state:
- **`.claude/settings.json`** (DEV-1, b6071fd) has allow/ask/deny rules but no `defaultMode` and no hooks.
- **`.claude/settings.local.json`** is per machine and ignored by Git. It also holds allow/ask/deny rules that merge on top.
- **Git hooks** (husky) already format staged files and block secrets **at commit time**. Claude Code hooks act earlier, on every tool call.
- **ESLint and Prettier** ignore `.claude/` and all Markdown (DEV-1 design D7).
- **`/sdd:run` stage d** currently pushes the archive commit to `main`. The ticket requires the agent to be unable to push to `main`.
- **Command arguments:** this Claude Code version substitutes them as `$0`, `$1`, …. The `sdd` commands were written for `$1`, `$2`.

Follows SDS §3 (`.claude/hooks/`), §3.1, §5.4, §6.1, §6.4, §7.4, §10, §11.

## Goals / Non-Goals

**Goals:**
- Guardrails are enforced in code with tests, not just written as instructions.
- Every hook decision is a pure function, so it can be unit-tested without Claude Code.
- No new dependencies.

**Non-Goals:**
- A complete shell parser. The guard matches the forms listed in the spec. It does not try to see through `eval`, base64 or aliases. CLAUDE.md and the human approval rules cover the rest.
- Subagent definitions. Those are DEV-1003 (DEV-6).
- Context7 or other MCP servers. Those are DEV-1004 (DEV-7).
- Changing the Git hooks from DEV-1.

## Decisions

### D1. Hook scripts live in `.claude/hooks/`, are linted and tested
- **Files:** `.claude/hooks/pre-tool-guard.mjs` and `.claude/hooks/post-edit-format.mjs`. Each exports pure functions and runs as a CLI only when executed directly (the same pattern as `scripts/check-versions.mjs`).
- **Tests:** `.claude/hooks/*.test.mjs`. The root `test` script runs `vitest run --dir scripts && vitest run --dir .claude/hooks`.
- **Lint scope:** ESLint `globalIgnores` changes `'.claude/'` to `'.claude/*'` plus `'!.claude/hooks/'`, and `.prettierignore` does the same, so the hook code is linted and formatted like `scripts/`. Generated OpenSpec files under `.claude/` stay ignored.
- *Alternative considered:* keeping the code in `scripts/claude-hooks/`. Rejected, because SDS §3 already places hooks in `.claude/hooks/`.

### D2. Hook protocol
- **Registration:** `settings.json` registers
  - `PreToolUse` with matcher `Bash|Read|Edit|MultiEdit|Write|Grep|Glob`, running `node "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-tool-guard.mjs"`
  - `PostToolUse` with matcher `Edit|MultiEdit|Write`, running `post-edit-format.mjs`
- **Input:** each hook reads one JSON object from stdin (`tool_name`, `tool_input`, `cwd`).
- **Output:** exit 0 means allow or done. Exit 2 with a message on stderr means block (PreToolUse) or "tell the agent" (PostToolUse).
- **Failure handling:** if the input can't be parsed, the guard **blocks** (fail closed) and the formatter **allows** (fail open), because a formatting failure must never lose the agent's edit.

### D3. Guard rules (`evaluateToolCall(input, { currentBranch })` → `{ allow } | { block, reason }`)
- **Splitting the command:** the shell command is split into simple commands on `&&`, `||`, `;`, `|` and newlines. Each part is tokenised (quotes respected), and each rule is checked per part. That way `git status && git push -f` is caught, and `echo "rm -rf"` is not.
- **The rules:**

| Rule | Match |
| --- | --- |
| `rm-recursive-force` | `rm` with both a recursive flag (`-r`/`-R`/`--recursive`, also combined like `-rf`, `-fr`, `-Rf`) and a force flag (`-f`/`--force`) |
| `force-push` | `git push` with `--force`, `-f`, `--force-with-lease[=…]`, or a refspec starting with `+` |
| `push-main` | `git push` where any refspec's destination is `main` (`main`, `x:main`, `HEAD:main`, `refs/heads/main`), or no refspec while `currentBranch === 'main'` |
| `no-verify` | `git commit` or `git push` with `--no-verify` (or `-n` for commit) |
| `env-dump` | `printenv`, or `env` with no arguments |
| `docker-volumes` | `docker compose down` / `docker-compose down` with `-v` or `--volumes` |
| `env-file-shell` | any token whose basename is `.env` or `.env.<x>` with `<x> !== 'example'` |
| `env-file-tool` | Read/Edit/MultiEdit/Write with such a `file_path`; Grep/Glob whose `path`, `pattern` or `glob` names one |

- **Current branch:** read once with `git rev-parse --abbrev-ref HEAD` in the CLI wrapper and passed in, so tests can supply it.
- **Message format:** `Blocked by .claude/hooks/pre-tool-guard.mjs (<rule>): <why>. <what to do instead>`. It never echoes secret values.

### D4. Formatter (`post-edit-format.mjs`)
- **Which files:** applies to `ts|tsx|js|mjs|cjs|json|yaml|yml` paths inside the project. Paths outside `CLAUDE_PROJECT_DIR`, and other types, exit 0 at once.
- **Commands:** runs `prettier --write --ignore-unknown <file>`, then (for JS/TS) `eslint --fix --no-warn-ignored <file>`, through `node_modules/.bin`. They run as separate processes with `execFileSync` (no shell), so the file name can't inject shell commands.
- **Result:** if ESLint still reports errors, exit 2 with ESLint's formatted output (truncated to 4 KB), so the agent fixes them. Warnings alone exit 0.

### D5. Permission configuration
- **`defaultMode`:** `"default"`.
- **ask:** `Bash(git push:*)`, `Bash(gh repo create:*)`, `Bash(gh pr create:*)`, `Bash(gh pr merge:*)`, `Bash(pnpm add:*)`, `Bash(pnpm remove:*)`, `Bash(pnpm install:*)`, `Bash(pnpm --filter * add:*)`, plus every Jira write tool (all already listed except the pnpm rules, which move here from the local file).
- **Docker:** there is no broad `Bash(docker:*)` rule. In Claude Code, an `ask` rule wins over `allow`, so a broad ask would also catch the `docker compose` commands the user approved for autonomous checks. Without a matching allow rule, every other Docker command falls through to the `default`-mode prompt. That meets the "asks first" criterion without overriding the approved list.
- **deny:** kept as it is. It is the backstop for `rm -rf`, force push, `npm`/`yarn`, `.env` reads and `docker compose down -v`.
- **The hook is the primary guard.** Deny rules match only a command's prefix, so `git status && rm -rf x` slips past them. The hook does not.

### D6. Settings checker (`scripts/check-claude-settings.mjs`, run by `pnpm lint`)
Reads `.claude/settings.json` and fails on:
- a rule that is not `Tool` or `Tool(spec)` with balanced parentheses
- a `Bash` rule whose `:*` is not at the end of the spec
- the same rule in more than one of allow/ask/deny
- a `defaultMode` other than `default|acceptEdits|plan|bypassPermissions`
- a hook command naming a `.claude/hooks/*.mjs` file that does not exist

Tests use fixture objects. This is the automated part of "`/permissions` shows no syntax warnings". Opening `/permissions` is still checked once by hand.

### D7. Skills (`.claude/skills/<name>/SKILL.md`)
- **Format:** front matter with `name` and a `description` that says when to use the skill (the same format as the OpenSpec skills already in the folder), then a numbered procedure and a checklist.
- **Content:** the procedures encode SDS §3.1 / §5.4 / §5.5 / §6.1 / §6.4 / §10 / §11, CLAUDE.md and the coding guidelines. They reference the real files that exist today (`services/auth/src/routes/health.ts`, `controllers/health.ts`, `middleware/error-handler.ts`, `packages/shared/src/schemas/common.ts`) as worked examples.
- **`sequelize-migration`:**
  - File name: `YYYYMMDDHHmmss-<kebab-description>.cjs`. The package is ESM, and sequelize-cli loads migrations with `require`.
  - New scripts: `pnpm db:migrate:undo` (root) → `pnpm --filter @app/database migrate:undo` (`sequelize-cli db:migrate:undo`). The skill needs them to prove a migration is reversible.
- **Demo check:** each skill is checked once by invoking it on a scratch branch (sample endpoint `GET /api/v1/ping`, a throwaway migration, a sample schema), confirming the result against the checklist and running the gates. Then the scratch branch is deleted. The demo is recorded in `docs/claude-setup.md`.

### D8. Nested instructions
- **`services/CLAUDE.md`:**
  - layering
  - `createApp(deps)` dependency injection
  - errors as `AppError` with SDS §6.4 codes
  - non-member 404 / wrong role 403
  - transactions for multi-step writes (§5.5)
  - tests in `src/**/*.test.ts` named with the FRS ID
  - no model access outside services
  - the logger rule
- **`apps/web/CLAUDE.md`:**
  - feature folders (SDS §3)
  - kebab-case files with named exports
  - data from the API only through the gateway (`/api`)
  - access token in memory
  - Zod response parsing with `@app/shared`
  - loading, empty and error states
  - RTL tests named with the FRS ID
- **Root `CLAUDE.md`:** gains a short "Claude Code setup" section that points to both files, `.claude/hooks/`, the skills and `docs/claude-setup.md`. Each file stays short, because they all load into context.

### D9. Workflow fixes
- **Argument placeholders:** `.claude/commands/sdd/{propose,apply,verify,ship,run}.md` use `$0` for the Jira key and `$1` for the change name.
- **`run.md` stage d order:** archive (`/opsx:archive` with spec sync) on the feature branch, then commit `chore(workflow): archive <change>` and push the branch, open the PR, merge it, `git switch main && git pull`, delete the branch, update Jira.
- **`CLAUDE.md`:** the "except the archive commit" wording is removed, so "Never commit to main directly" and "Never push to main" become absolute again. The `push-main` hook rule enforces them.

## Risks / Trade-offs

- [A determined command can evade the pattern-based guard, e.g. `sh -c "$(echo cm0gLXJm | base64 -d)"`] → The deny list, the default-mode prompt and CLAUDE.md remain. The guard targets mistakes and accidents, not a hostile agent. This limit is documented in `docs/claude-setup.md`.
- [The formatter adds latency to every edit] → It runs only on supported file types, and ESLint runs on that single file only.
- [The guard fails closed if its input is malformed, which could block every tool call] → It is tested with real hook payloads. Removing `hooks` from `settings.json` disables it, and the human can always do that.
- [Archiving before the merge means the PR also contains the archive move] → This is intended: `main` gets the archived change and the synced specs in one reviewed merge.
- [`settings.local.json` is per machine and can loosen rules] → The hooks don't depend on it. `docs/claude-setup.md` lists the recommended local file contents.

## Migration Plan

1. Merge. Claude Code picks up `.claude/settings.json` hooks when the next session starts.
2. Anyone with an older `settings.local.json`: remove the now-duplicated `pnpm add`/`remove`/`install` ask entries (optional; duplicates in the local file are harmless).
3. Rollback: revert the merge commit, or delete the `hooks` key.
