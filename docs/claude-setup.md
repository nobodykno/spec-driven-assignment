# Claude Code setup

How the coding agent is configured in this repository (DEV-5 / DEV-1002), and how each part was
tested. Design: `openspec/changes/dev-5-claude-setup/design.md`.

## Acceptance criteria → evidence

| DEV-5 acceptance criterion | Evidence (section below) |
| --- | --- |
| `rm -rf`, `git push --force`, `git push origin main`, `printenv`, reading `.env` → blocked with a message, exit 2 | [Hooks](#hooks) unit tests (62) + [Live hook check](#live-hook-check-task-53) |
| Editing a `.ts` file → auto-formatted | [Hooks](#hooks) formatter tests (5) + live check (`live-format.ts`) |
| `git push`, `pnpm add`, `docker`, `gh pr create` → ask first | [Permissions](#permissions) (ask rules, `defaultMode: default`) |
| `/permissions` lists the rules with no syntax warnings | [Settings checker](#settings-checker) (`pnpm lint`); a human looks at `/permissions` once at checkpoint B |
| A skill is invoked → Claude follows its pattern | [Skill demos](#skill-demos-tasks-6163) |
| Hook tests and results recorded here | this document |

## Instructions

| File | Loaded when | Content |
| --- | --- | --- |
| `CLAUDE.md` | always | workflow (`/sdd:run`, chat approval), structure, commands, code rules, Git hooks, Claude Code setup, never-list |
| `services/CLAUDE.md` | working under `services/` | layering, `createApp(deps)`, Zod input, AppError + SDS §6.4, 404/403, transactions, tests, logging |
| `apps/web/CLAUDE.md` | working under `apps/web/` | feature folders, kebab-case + named exports, gateway-only API, Query hooks, token in memory, states, RTL tests |
| `docs/CODING_GUIDELINES.md` | referenced by all three | naming, style, structure, TypeScript, errors, commits |

## Permissions

`.claude/settings.json` (committed). `defaultMode: default` means any command that no rule allows
prompts the human.

| List | Rules | Why |
| --- | --- | --- |
| allow | `curl -s` to localhost; `docker compose stop/start/up/exec/logs/ps`; `pnpm dev`, `pnpm db:*`, Playwright, `pnpm test:e2e`; `git merge main`, `git worktree` | autonomous local checks the user approved |
| ask | `git push`, `gh repo create`, `gh pr create`, `gh pr merge`, `pnpm add/remove/install/i/up/update`, `pnpm --filter * add`, `--filter=* add`, `-F * add`, `-w add`, all Jira write tools | outward-facing or dependency changes need a human |
| deny | `.env` / `.env.local/.development/.production/.test` reads, `printenv`, `env`, `git push --force`/`-f`, `rm -rf`, `npm`, `yarn`, `docker compose down -v`, `wget` | backstop for the hook (prefix match only) |

Other Docker commands (`docker run`, `docker build`, `docker volume rm`, …) match no rule, so they
prompt. There is deliberately no broad `Bash(docker:*)` ask rule. An ask rule would override the
approved `docker compose` allows, because ask wins over allow.

## Hooks

Registered in `.claude/settings.json`; code and tests in `.claude/hooks/` (linted, formatted and
run by `pnpm test` like `scripts/`).

**PreToolUse `pre-tool-guard.mjs`** (matcher `Bash|Read|Edit|MultiEdit|Write|Grep|Glob`). It reads
the payload from stdin and, to block, prints `Blocked by .claude/hooks/pre-tool-guard.mjs (<rule>): …`
and exits 2.

| Rule | Blocks |
| --- | --- |
| `rm-recursive-force` | `rm` with a recursive and a force flag (`-rf`, `-fr`, `-Rf`, `-r -f`, long forms) |
| `force-push` | `git push --force`, `-f`, `--force-with-lease`, `+refspec` |
| `push-main` | `git push` to `main` / `HEAD:main` / `refs/heads/main`; `HEAD` or `@` while on `main`; `--all`, `--mirror`; a plain push while on `main` or when the branch is unknown |
| `no-verify` | `git commit --no-verify` / `-n`, `git push --no-verify`, `git -c core.hooksPath=…`, `HUSKY=0 git …` |
| `env-dump` | `printenv`, bare `env` |
| `docker-volumes` | `docker compose down -v` / `--volumes`, `docker-compose down -v` |
| `env-file-shell` | any shell word naming `.env` / `.env.*` (not `.env.example`) |
| `env-file-tool` | Read/Edit/MultiEdit/Write `file_path`, Grep `path`/`glob`, Glob `pattern`/`path` naming such a file |
| `malformed-input` | unreadable payload (fails closed) |

How a command is checked:
1. **Raw text first:**
   - An env-file name anywhere in the command blocks it: in quotes, in `--env-file=…`,
     `@file` or `--target=…`, or inside a heredoc. `.env.example` is the exception.
   - So does `HUSKY=0`, even when quoted or exported. A standalone quoted message, such as a
     commit message that mentions it, is ignored.
2. **Substitutions:** every `$( … )` and backtick body is checked as a command of its own,
   including inside double quotes. So are `bash -c` / `sh -c` strings (recursion depth 3).
3. **Simple commands:** chained commands (`&&`, `||`, `;`, `|`, newlines), groups (`( )`, `{ }`)
   and redirections (`<`, `>`) are split into simple commands. In each one the guard skips:
   - leading assignments (`A=1 B=2`)
   - paths (`/bin/rm`)
   - wrappers (`sudo`, `command`, `exec`, `nohup`, `time`, `timeout`, `nice`, `xargs`,
     `env …`, `if/elif/then/else/while/until/do`). After a wrapper, checking continues at the
     next guarded command, so wrapper options with values (`sudo -u root`, `xargs -n 1`)
     don't hide it.
   - git global options (`-C`, `-c`, `--no-pager`, …). `git -c core.hooksPath=…` and
     `git config core.hooksPath …` count as hook bypasses.
   - push option values (`-o`, `--repo`).
   - Docker options before `compose` (`--context x`).
   
   Quoted words are data for these rules: `echo "rm -rf /"` and
   `git commit -m "explain --no-verify"` are allowed.

**PostToolUse `post-edit-format.mjs`** (matcher `Edit|MultiEdit|Write`). For a
`ts/tsx/js/mjs/cjs/json/yaml/yml` file inside the project, it runs `prettier --write` and (for code)
`eslint --fix`. Remaining ESLint errors go back to the agent with exit 2. It never fails the edit
itself (it fails open).

**Limits.** The guard matches command patterns. It is not a shell interpreter, so deliberately
obfuscated commands (`eval`, base64, aliases, variables holding command names) are out of scope; the
deny list, the default-mode prompt and CLAUDE.md remain. The hooks apply to the agent's tool calls
only, not to commands a human runs.

**Accepted false positives.** The raw-text scan errs on the side of blocking:
- Any shell command that merely *mentions* an env-file name is blocked. That includes a commit
  message, an `echo`, or a heredoc that writes documentation.
- A substitution inside single quotes (`echo '$(rm -rf x)'`) is blocked although the shell
  would not run it.

The agent then writes such text with the Edit/Write tools, and rewords commit messages. This
happened several times while building this ticket; the guard blocked its own author.

**Disable the hooks:** remove the `hooks` key from `.claude/settings.json` (or revert DEV-5).
Claude Code picks up the change without a restart.

## Settings checker

`scripts/check-claude-settings.mjs` (`pnpm check:claude-settings`, part of `pnpm lint`) fails on:
- a malformed rule (`Tool` or `Tool(spec)`, balanced)
- `:*` that is not at the end (e.g. `Bash(curl -s:* http://localhost*)`)
- one rule in two lists
- an unknown `defaultMode`
- unbalanced parentheses inside a rule
- a hook script that is missing (any `node "<path>"` command)
- the guard or formatter hook not being registered
- the ask-first policy not being met: `defaultMode` other than `default`; a missing ask rule for
  `git push`, `gh pr create/merge`, `pnpm add/remove/install` or Jira writes; an `allow` for
  `Bash(docker:*)`, `git push`, `gh pr merge` or `pnpm add`. This makes the "asks first" scenarios
  testable (`NFR-SEC-005: requires the ask rules, default mode and no broad docker allow`).

## Automated test results

| Suite | Tests | Result |
| --- | --- | --- |
| `.claude/hooks/pre-tool-guard.test.mjs` | 121 | pass |
| `.claude/hooks/post-edit-format.test.mjs` | 6 | pass |
| `scripts/check-claude-settings.test.mjs` | 20 | pass |

The counts include the review round-1 and round-2 additions:
- guard bypass cases: wrappers, substitutions, embedded env-file names, `git config`, quoted `HUSKY`
- the formatter symlink case
- the settings policy, parenthesis and hook-script checks, and broad allow rules covering ask-first commands

## Recommended local settings

`.claude/settings.local.json` is per machine and not committed; its rules merge on top. Keep
it to personal additions, and remove rules that contradict the committed policy:
- remove `Bash(cat *.env*)` (blocks reading `.env.example`; the hook already blocks real `.env` files)
- the `pnpm add/remove/install` ask rules now live in the committed file and can be dropped locally
- never add `allow` rules for `git push`, `gh pr merge` or Jira writes, because those stay ask

## Live hook check (task 5.3)

Run on 2026-10-30 15:08 IST, in the agent session working on `feature/DEV-5-claude-setup`, after
`.claude/settings.json` registered the hooks. Claude Code picked up the hooks without a restart.
Where a deny rule would have stopped a command first, a variant that only the hook catches was
used, so the result shows the hook itself.

| Attempted by the agent | Result |
| --- | --- |
| `git commit --no-verify --dry-run …` | Blocked: `Blocked by .claude/hooks/pre-tool-guard.mjs (no-verify): Git hooks must not be bypassed (CLAUDE.md). …` |
| `rm -fr tmp-guard-check` | Blocked (`rm-recursive-force`) |
| `git push --force-with-lease origin feature/DEV-5-claude-setup` | Blocked (`force-push`) |
| `git push origin main` | Blocked (`push-main`): "the agent never pushes to main. Push the feature branch and merge through a PR." |
| `true && printenv` | Blocked (`env-dump`). The chained form gets past the deny rule `Bash(printenv:*)`, but not the hook |
| `cat services/auth/.env` | Blocked (`env-file-shell`) |
| `docker compose down --volumes` | Blocked (`docker-volumes`) |
| Read `services/auth/.env.staging` / Write `tmp-live-check/.env.staging` | Refused by the permission layer before the hook ran ("denied by your permission settings"); nothing written. The hook's own file-tool rule is covered by unit tests |
| Write `live-format.ts` with double quotes, no semicolons, one-line function | File on disk right after the write: single quotes, semicolons, function body on its own lines |
| Write `live-any.ts` containing `export const liveAny: any = 1;` | Hook reported to the agent: `ESLint errors remain in tmp-live-check/live-any.ts … @typescript-eslint/no-explicit-any` |

Every blocked command reached Claude Code as `PreToolUse:Bash hook error: … Blocked by …`. The hook
exited with code 2, and the command did not run. The scratch files were removed afterwards.

**Local-environment note:** on this machine, the agent could not read `services/auth/.env.example`.
Both `Read` and `cat` were refused by rules outside the committed config: the per-machine
`settings.local.json` still has `Bash(cat *.env*)`, and machine-level settings deny reading the
file. The committed `.claude/settings.json` and the hook both allow `.env.example` (unit tests
`NFR-SEC-005: allows .env.example`). See "Recommended local settings" below.

## Skill demos (tasks 6.1–6.3)

Each skill was invoked with the Skill tool on a scratch branch, followed step by step, checked
against its checklist, and then discarded (scratch branch deleted).

### `zod-contract` (6.1)

Request: "add a sample `PingResponse` contract `{ status: 'pong', time: ISO datetime }`" (demo ID FR-SYS-002).

| Step | Result |
| --- | --- |
| Area / file | `packages/shared/src/schemas/common.ts` (area `common`; a system endpoint) |
| Tests first | 4 tests named `FR-SYS-002: …` added to `common.test.ts`; `pnpm --filter @app/shared test` failed (4 ×) |
| Schema | `PingResponseSchema = z.object({ status: z.literal('pong'), time: z.iso.datetime() })` + `export type PingResponse`; FRS comment |
| Re-export | already covered by `export * from './schemas/common.js'` |
| Verify | `pnpm --filter @app/shared test` 34/34, `build` OK, ESLint clean |
| Checklist | all 6 items met |

### `express-endpoint` (6.2)

Request: "add `GET /ping` to services/tracker returning `PingResponse`, clock injected" (demo ID FR-SYS-002).

| Step | Result |
| --- | --- |
| Contract first | `PingResponseSchema` + `PingResponse` in `packages/shared/src/schemas/common.ts` (zod-contract) |
| Test first | `services/tracker/src/ping.test.ts`: `FR-SYS-002: returns pong with the injected time` failed; `FR-SYS-002: other methods on /ping return 404 NOT_FOUND` |
| Service | `src/services/ping-service.ts`: `ping(now): PingResponse`, no `req`/`res`, explicit return type |
| Controller | `src/controllers/ping.ts`: maps to `res.status(200).json(...)`, no model import |
| Route | `src/routes/ping.ts`: `pingRouter(now)` wiring only, mounted in `createApp` before `notFoundHandler`; clock injected as `deps.now` |
| Verify | `pnpm --filter tracker test` 8/8, `typecheck` OK, `pnpm lint` 0 errors |
| Checklist | all 8 items met (auth/membership/transaction items not applicable to a public read-only endpoint) |
| Negative check | a controller importing `@app/database` is rejected by ESLint: `'@app/database' import is restricted … Only services access models (SDS §3.1)  no-restricted-imports`. This checklist item is enforced by a lint rule added in this task |

### `sequelize-migration` (6.3)

Request: "throwaway table `skill_demo` (uuid pk, label, timestamps) with an index on label".

| Step | Result |
| --- | --- |
| Applied migrations | none yet (`git log -- packages/database/migrations`: only the folder's `.gitkeep`) |
| File | `packages/database/migrations/20261030094257-create-skill-demo.cjs` (UTC timestamp, kebab-case, `.cjs`) |
| `up` / `down` | `createTable` + `addIndex` in one transaction; `down` removes the index and drops the table in a transaction |
| `pnpm db:migrate` | `20261030094257-create-skill-demo: migrated (0.067s)` |
| `psql \d skill_demo` | columns `id uuid default gen_random_uuid()`, `label text not null`, `created_at`/`updated_at timestamptz default now()`; indexes `skill_demo_pkey`, `skill_demo_label_idx` |
| `pnpm db:migrate:undo` | `reverted (0.063s)`; `\d skill_demo` → `Did not find any relation named "skill_demo"`; `SequelizeMeta` back to 0 rows |
| Checklist | all items met. The model item doesn't apply: the throwaway table had no model |
| Found by the format hook | while the agent wrote the migration, the PostToolUse hook reported `Parameter name 'Sequelize' must match … camelCase (naming-convention)`. sequelize-cli passes the Sequelize class under that name, so `naming-convention` is now off for `packages/database/migrations/**` and `seeders/**` (a probe migration lints clean) |
