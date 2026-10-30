# Claude Code setup

How the coding agent is configured in this repository (DEV-5 / DEV-1002), and how each part was
tested. Design: `openspec/changes/dev-5-claude-setup/design.md`.

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
