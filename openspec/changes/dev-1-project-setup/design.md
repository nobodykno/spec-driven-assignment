# Design: DEV-1 Project setup

## Context

See proposal.md (Why) for the gaps in the existing scaffold. Here is what's already in place and what limits the design:
- pnpm workspaces are already set up for `apps/*`, `services/*` and `packages/*`.
- `tsconfig.base.json` uses `strict`, ES2022 and NodeNext, and every package is ESM (`"type": "module"`).
- The local toolchain is Node 22.23.1 and pnpm 11.28.9.
- `packages/database` is the only package allowed to import `sequelize` (CLAUDE.md).

Follows SDS §2.1, §3, §3.1, §4, §5.4, §6.1, §6.4, §7.4 (secrets only from env), §10, §11 and §12.

## Goals / Non-Goals

**Goals:**
- The repository passes all four gates with no database running.
- `pnpm db:up` gives a healthy PostgreSQL 16 on port 5433, and `docker compose up` starts the whole stack.
- Every service follows the SDS layout that later tickets extend: `app.ts`/`index.ts`, routes, controllers and the error middleware.

**Non-Goals:**
- Business tables, models or migrations. These start in DEV-1006.
- JWT verification, `X-Internal-Token`, rate limiting, helmet/CORS and pino logging (DEV-1006 and later). The gateway in this change is only a health check plus the existing auth proxy.
- Proxying tracker routes (DEV-1007).
- Tailwind, shadcn/ui, TanStack Query and React Router (DEV-1011). The web app gets only what is needed to show API status.
- The full Playwright e2e journey (DEV-1016). DEV-1 only adds Playwright for one browser check (D14). CI pipelines (the pre-push hook is the only gate before GitHub for now).
- Full secret scanning (entropy checks, history scans). The staged-secret check catches only the obvious cases listed in D13.

## Decisions

### D1. Shared contracts first (SDS §1.2.1)
`@app/shared` exports:
- `HealthResponseSchema`: `{ status: "ok" | "error" }`
- `ErrorCodeSchema`: `z.enum` of every SDS §6.4 code
- `ErrorResponseSchema` and the inferred types
- `AppError` class: `code`, `status`, `message`, `details?`

This is written before any service or web code. Putting `AppError` in shared means auth, tracker and gateway all use one error type. *Alternative:* a separate copy in each service. Rejected because the copies would drift apart.

### D2. Database health via `checkDatabase(timeoutMs = 2000)`
`@app/database` exports:
- `sequelize`, created lazily from `DATABASE_URL`. The default is `postgresql://dev:dev@localhost:5433/tracker` (SDS §12.3).
- `checkDatabase()`, which runs `sequelize.authenticate()` raced against a timeout and returns `Promise<boolean>`. It never throws and never logs.

The pool reconnects on its own, so a database that comes back makes `/health` healthy again with no service restart.

*Alternative:* call `connectDatabase()` on every request. That is what the current code does: it throws, logs on every call and has no timeout. Rejected.

The 2 s timeout plus `dialectOptions.connectionTimeoutMillis: 2000` keeps the response inside the 3 s limit in the spec.

### D3. Health controllers are testable without Postgres
Each service builds its app with `createApp({ checkDatabase })` (dependency injection). `app.ts` exports `createApp`, and `index.ts` calls it with the real function and starts listening.

Supertest tests pass in a stub that returns `true` or `false`. `packages/database` has one unit test that calls `checkDatabase()` against an unroutable URL (`postgresql://x@127.0.0.1:1/x`, short timeout) and expects `false`. That test needs no Docker.

*Alternative:* `vi.mock("@app/database")`. Rejected because it ties tests to module paths.

The gateway's `createApp({ authServiceUrl })` takes the target URL, so the 503 test can point it at a closed port.

### D4. Service layout (SDS §3.1)
```
src/app.ts               createApp(): express.json({limit:"100kb"}), routes, 404 handler, errorHandler
src/index.ts             reads PORT, calls createApp(...).listen
src/routes/health.ts     router wiring only
src/controllers/health.ts
src/middleware/error-handler.ts   AppError → {error}, unknown → 500 INTERNAL_ERROR (no stack)
```
Tracker is a copy of auth with port 4002. In Express 5, rejected promises in async handlers go to the error middleware automatically (SDS §10).

### D5. Gateway health and proxy errors
- `/health` and `/api/v1/health` share one handler and never call downstream services.
- `/api/v1/auth` uses `createProxyMiddleware` v4 with `on.error`. When it fires, the gateway sends 503 `SERVICE_UNAVAILABLE` in the shared error format.
- The mount path is removed before forwarding, so `/api/v1/auth/health` arrives at auth as `/health`. This matches today's behaviour.
- `express.json()` is **not** applied before the proxy, because it would consume the request body before it is forwarded.

Adding `/api/v1/health` changes SDS §6.2, which is updated in this change.

### D6. Root scripts
| Script | Command |
| --- | --- |
| build | `pnpm -r build` (shared → database → services/web; pnpm orders by dependency graph) |
| typecheck | `pnpm -r typecheck` |
| test | `pnpm -r test && vitest run --dir scripts`; each workspace has its own `vitest.config.ts` (web uses `jsdom`). The root `vitest.config.ts` is removed, and the root-level `scripts/` tests run last |
| lint | `pnpm check:versions && eslint . && prettier --check .` |
| format | `prettier --write .` |
| check:versions | `node scripts/check-versions.mjs` |
| db:up / db:down | `docker compose up -d --wait postgres` / `docker compose down` |
| db:migrate | `pnpm --filter @app/database migrate` (sequelize-cli `db:migrate`; no-op with zero migrations) |
| dev | `concurrently` over auth, tracker, api-gateway, web |

Running tests per workspace keeps the `pnpm --filter <name> test` command from CLAUDE.md working, and lets web use a different test environment.

`db:up` uses `--wait`, so the command returns only once the healthcheck reports healthy.

### D7. Lint config
Root `eslint.config.js` (flat config) with:
- `@eslint/js` recommended and `typescript-eslint` `strict`
- `no-explicit-any: error` and `ban-ts-comment` (ts-ignore and ts-nocheck banned, `ts-expect-error` allowed only with a description)
- `react-hooks` recommended for `apps/web/**`
- `eslint-config-prettier` last
- Ignores: `dist`, `coverage` and `.claude/` (generated files)

Prettier uses `.prettierrc.json` (default style plus `printWidth: 100`) and a `.prettierignore` that covers `pnpm-lock.yaml`, `dist`, `.claude/commands/opsx` and `openspec/changes/archive`.

> **Implementation note (task 1.4):** `.prettierignore` also excludes `*.md`, `openspec/` and all of `.claude/`. Running Prettier over Markdown rewrote the approved proposal and specs, `CLAUDE.md` and the FRS/SDS tables, and the OpenSpec CLI owns `openspec/config.yaml`. Prettier therefore checks code and config only (ts/tsx/js/mjs/cjs/json/yaml/html). ESLint ignores `openspec/` and `.claude/` for the same reason. The lint behaviour in the spec (unformatted *source* files fail) is unchanged.

### D8. Version checker (`scripts/check-versions.mjs`)
A dependency-free Node script.
- **package.json files:** it walks every workspace `package.json` and fails on any value matching `^`, `~`, `*`, `x`, `>`, `<`, `||` or `latest`. `workspace:*` is allowed.
- **Image tags:** it parses `image:` lines in `docker-compose.yml` and `FROM` lines in every Dockerfile. It fails on a missing tag, `latest`, or a tag without a full `major.minor` version, such as `16`, `22-slim` or `16-alpine`.
- **pnpm installs:** it fails on `pnpm@latest`.

It is tested in `scripts/check-versions.test.mjs` with fixture inputs. The rule is enforced in code, so it doesn't rely on reviewers spotting a `^`.

### D9. Docker
- **Compose `postgres`:**
  - image `postgres:<exact>-alpine`
  - `POSTGRES_USER=dev`, `POSTGRES_PASSWORD=dev`, `POSTGRES_DB=tracker`
  - ports `5433:5432`
  - volume `tracker_pgdata`, a new name so stale credentials from the old `pgdata` volume are not reused
  - healthcheck `pg_isready -U dev -d tracker`
- **Compose app services:** build from their Dockerfiles. auth and tracker use `depends_on: postgres: condition: service_healthy` and `DATABASE_URL=postgresql://dev:dev@postgres:5432/tracker`. Only the gateway (4000) and web (8080) are published.
- **Dockerfiles:**
  - `node:<exact>-alpine` for build and runtime
  - pnpm installed with `corepack prepare pnpm@11.28.9`
  - `pnpm install --frozen-lockfile` with no `|| true`
  - build, then `pnpm deploy --prod` the one service into `/out`
  - runtime runs as user `node`
  - web: `nginx:<exact>-alpine` serving `dist`, with `/api/` proxied to `api-gateway:4000`

The compose credentials are local-development values that SDS §12.3 already documents. They are not secrets. Real secrets come from env (SDS §7.4).

### D10. Environment loading
Dev scripts use `tsx watch --env-file-if-exists=.env src/index.ts` (Node ≥ 22.9), so no dotenv dependency is needed. `.env.example` lists every variable each service reads. `.env` is already git-ignored.

### D11. Web
`App.tsx` runs a single `fetch("/api/v1/health")` and validates the response with `HealthResponseSchema` (existing approach). It renders loading, then "API: online" or "API: offline".
- The component test stubs `globalThis.fetch` with `vi.fn` for each scenario.
- Vite proxies `/api` to `http://localhost:4000`.
- TanStack Query is deliberately left out (Non-Goals). DEV-1011 will replace this component with a query hook.

### D12. Library documentation check (Context7)
Context7 MCP is **not configured** in this repository: `.mcp.json` only contains `atlassian`. Versions and peer compatibility were therefore checked with `pnpm view <pkg> version peerDependencies engines` on 2026-10-29:

| Library | Version | Topic checked |
| --- | --- | --- |
| typescript-eslint | 8.72.1 | peer `typescript >=4.8.4 <6.1.0`, so TypeScript is pinned to 5.9.3, not 7.x |
| vitest | 5.0.5 | peer `vite ^6.4 \|\| ^7 \|\| ^8`, `@types/node ^22 \|\| >=24`; engines `node ^22.12` |
| @vitejs/plugin-react | 6.1.2 | peer `vite ^8`, so Vite is 8.3.5 |
| http-proxy-middleware | 4.2.1 | engines `node ^22.15`; the `on.error` handler API should be confirmed against v4 docs during apply |
| @testing-library/react | 16.3.3 | peer React ^19 and `@testing-library/dom ^10` |
| express | 5.3.0 | async error forwarding (SDS §10) |

During apply, check the Express 5 and http-proxy-middleware v4 APIs against the docs, either with Context7 (if it gets configured) or the official docs, and record the result in `docs/versions.md`.

### Docs checked (during apply)

Context7 is still not configured, so these were checked against the installed package's own docs and type definitions:

| Library | Version | Topic | Source / finding |
| --- | --- | --- | --- |
| http-proxy-middleware | 4.2.1 | error handler, mount path | `dist/types.d.ts`: `on.error(err, req, res: ServerResponse \| Socket, target?)`. README: when mounted with `app.use(path, proxy)` the path is relative to the mount point, so `/api/v1/auth/health` reaches auth as `/health`. Unhandled, the default status is 504, so `on.error` sends 503 instead |
| eslint-plugin-react-hooks | 7.1.1 | flat config | `configs.flat.recommended` is the flat-config object; `configs.recommended` is the legacy form |
| eslint | 10.13.0 | config helpers | `eslint/config` exports `defineConfig` and `globalIgnores` |

### D13. Git hooks (husky 9, lint-staged 17, commitlint 21)
- **Install:** root `"prepare": "husky"` sets `core.hooksPath=.husky/_` on every `pnpm install`. Dockerfiles set `ENV HUSKY=0` before `pnpm install`, so builds without `.git` skip hook setup instead of depending on husky's no-`.git` behaviour.
- **`.husky/pre-commit`:** `pnpm lint-staged` then `node scripts/check-staged-secrets.mjs`.
  - `lint-staged.config.mjs`: `*.{ts,tsx,js,mjs}` → `eslint --fix --no-warn-ignored`, `prettier --write --ignore-unknown`; `*.{json,md,yaml,yml}` → `prettier --write --ignore-unknown`. `.prettierignore` still excludes `*.md`, `openspec/` and `.claude/` (D7 note), so those are passed but left untouched.
- **`scripts/check-staged-secrets.mjs`:** dependency-free. Lists staged files with `git diff --cached --name-only --diff-filter=ACMR -z` and reads the **staged** blob with `git show :<path>`, so unstaged edits can't hide or fake a finding. Pure `findSecrets([{ path, content }])` is exported for tests; the CLI part only gathers input and sets the exit code.
  - File names: basename `.env` or `.env.*`, except `.env.example`. The content of these files is never read.
  - Content: `-----BEGIN [A-Z ]*PRIVATE KEY-----`; `JWT_SECRET=` (optionally quoted / `export`-ed) with a value that is not empty or a placeholder (`change-me`, `changeme`, `<...>`, `${...}`, `your-...`, `xxx...`); `AKIA[0-9A-Z]{16}`; `aws_secret_access_key` followed by a 40-character base64-like value.
  - Output names the file and the rule, never the matched text. Binary files (NUL byte) are skipped.
  - Test fixtures build the secret strings by concatenation, so the test file itself never matches when it is committed.
- **`.husky/commit-msg`:** `pnpm commitlint --edit "$1"`.
  - `commitlint.config.mjs` extends `@commitlint/config-conventional` and sets: `type-enum` (feat, fix, refactor, test, docs, chore, build, ci, perf, style); `header-max-length` 72; `body-max-line-length` 72; `subject-full-stop` never `.`; `subject-case` never sentence/start/pascal/upper-case (the config-conventional rule). This means "subject starts lowercase", not "the whole subject is lowercase", so `return 503 SERVICE_UNAVAILABLE` stays legal.
  - **Superseded by D15 (2026-10-30):** the scope is now an area, not a Jira key. `scope-enum` lists the areas and `scope-empty` is `never`. A local plugin rule `footer-refs` requires a `Refs: DEV-N` footer on every commit. The main-branch housekeeping exception and `COMMITLINT_BRANCH` are removed, because the footer is mandatory everywhere.
  - Merge commits are ignored (commitlint default ignores).
  - Tests (`scripts/commitlint.test.mjs`) run the real CLI: `pnpm exec commitlint --config commitlint.config.mjs` with the message on stdin (no branch input since D15). They assert the exit code, so they cover the exact config the hook uses.
- **`.husky/pre-push`:** `pnpm build && pnpm lint && pnpm typecheck && pnpm test`. The gates need no database (quality-gates spec), so pushing works with Docker stopped.
- **No bypass:** `CLAUDE.md` gets "Never bypass hooks with --no-verify. If a hook fails, fix the cause." DEV-1002's PreToolUse hook can later block `--no-verify` mechanically.
- **Docs location:** the "Git hooks" section goes in `CLAUDE.md`, not `docs/workflow.md`, because `docs/workflow.md` is created by DEV-1005 and does not exist yet.
- **Versions** (checked with `pnpm view` on 2026-10-30): husky 9.1.7 (node >=18); lint-staged 17.6.0 (node >=22.22.1, so the root `engines.node` floor rises from 22.12.0, and local Node 22.23.1 satisfies it); @commitlint/cli and @commitlint/config-conventional 21.2.4 (node >=22.12.0, released together). lint-staged 16.4.0 (node >=20.17) is the fallback if the engines bump is rejected.

### D14. Browser check with Playwright
- `@playwright/test` 1.64.1 at the root, `playwright.config.ts` with `testDir: "e2e"`, Chromium only, headless, `baseURL` from `E2E_BASE_URL` (default `http://localhost:5173`). No `webServer` block: the agent starts and stops the dev processes in the background, so the same spec can run against the dev server or the Docker stack.
- `e2e/web-api-status.spec.ts` reads `E2E_EXPECT=online|offline`, loads `/`, waits for the `status` role to show `API: online` or `API: offline`, and saves a full-page screenshot to `docs/evidence/DEV-1/web-api-<state>.png`.
- Root script `test:e2e`: `playwright test`. It is not part of `pnpm test`, so the quality gates still need no browser, server or database.
- Online run: Postgres, auth, gateway and the web dev server up. Offline run: the gateway stopped and the page reloaded, which is the real "gateway not running" scenario, not a mocked route.
- `test-results/` and `playwright-report/` are git-ignored. The screenshots in `docs/evidence/` are committed.

### D15. Coding guidelines enforcement (`docs/CODING_GUIDELINES.md`)
- **ESLint** (`eslint.config.js`, flat config; the repo is on ESLint 10.13.0, which uses the same flat format as ESLint 9):
  - core: `eqeqeq` always, `curly` all, `max-depth` 3, `complexity` 10, `max-lines-per-function` [warn, 30, skip blank lines and comments], `no-console` warn, `prefer-const`, `no-var`, `no-eval`, `no-implied-eval`, `no-new-func`.
  - `semi` always and `quotes` single (avoid-escape) are placed **after** `eslint-config-prettier`, because that config turns them off. They match `.prettierrc`, so the two never fight. Both rules are deprecated in ESLint core, but still shipped and working in ESLint 10.
  - TypeScript: `no-explicit-any` error, `explicit-function-return-type` error (allow typed function expressions), `no-unused-vars` error (args starting with `_` ignored).
  - Named exports only: `no-restricted-exports` with `restrictDefaultExports` everywhere except `*.config.{js,mjs,ts}`, where tools require a default export.
  - Naming: `@mindfiredigital/eslint-plugin-hub` rules `file-kebabcase`, `vars-camelcase`, `class-pascalcase`, `function-camelcase` (error). The MERN preset's `react-filename-pascalcase` is **not** used, because it contradicts the kebab-case rule. If the plugin fails under ESLint 10 (its parser dependency is `@typescript-eslint/typescript-estree` 5.x), it is removed, the reason goes into `docs/versions.md`, and `scripts/check-file-names.mjs` (with tests) enforces kebab-case file names.
  - Tests: `max-lines-per-function` is off for `*.test.*` and `e2e/**`, because `describe` blocks are long by design.
- **Prettier** `.prettierrc`: `{ "semi": true, "singleQuote": true, "tabWidth": 2, "printWidth": 100, "trailingComma": "all", "bracketSpacing": true, "arrowParens": "always" }`. The `.prettierignore` from D7 is unchanged.
- **Rule tests** (`scripts/lint-rules.test.mjs`): use the ESLint Node API (`new ESLint().lintText(code, { filePath })`) on small fixtures and assert the reported rule ids, so the config is tested like the commitlint config.
- **Logging:** "use the logger, not console" needs a logger. pino arrives with DEV-1006 (SDS §4 / design Non-Goals). Until then `no-console` stays a warning, and the three `listen` messages in `index.ts` stay. They are the only console calls in app code. CLI scripts in `scripts/` are exempt, because console is their user interface.
- **Commit convention** (supersedes the D13 scope rules): `scope-enum` [auth, tracker, gateway, web, shared, database, docker, workflow, docs], `scope-empty` never, `type-enum` [feat, fix, docs, style, refactor, test, chore, build, ci, perf], `header-max-length` 72, `subject-case` as in D13, plugin rule `footer-refs` (a `Refs: DEV-<n>` line). Root tooling (hooks, ESLint, scripts, OpenSpec, Claude config) uses the `workflow` scope. "Imperative mood" can't be linted reliably; the reviewer checks it.
- **Editor:** `.vscode/settings.json` sets `editor.formatOnSave`, `editor.defaultFormatter: esbenp.prettier-vscode` and `editor.codeActionsOnSave: { "source.fixAll.eslint": "explicit" }`. `.vscode/extensions.json` recommends `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode` and `eamodio.gitlens`. `.gitignore` changes `.vscode/` to `.vscode/*` with `!.vscode/settings.json` and `!.vscode/extensions.json`.

## Risks / Trade-offs

- [The http-proxy-middleware v4 API changed from v3] → task 5.3 is test-first: the 503 test fails until the `on.error` wiring is correct.
- [Exact Docker tags could not be looked up during planning, because Docker Hub access was denied] → task 7.1 picks the newest `16.x`, `22.x` and `1.x` alpine tags, confirms each with `docker pull`, and the version checker rejects anything that isn't exact.
- [Postgres moves from 5432 to 5433 and the credentials change, which breaks existing local `.env` files] → document this in `.env.example` and docs/versions.md. The new volume name avoids stale-credential errors.
- [The React 18 → 19 and Vite 6 → 8 jumps] → the web app is a single component, so the upgrade surface is minimal.
- [`pnpm deploy` behaviour in pnpm 11] → verified by `docker compose build` in task 7.4.
- [Deleting `openspec/changes/project-setup` removes history] → it remains in git history (commit a629415). Keeping it would mean its `health-check`/`api-routing` specs could be archived alongside, and conflict with, this change's specs.

- [Hooks slow down commits and pushes] → lint-staged only touches staged files. Pre-push runs the full gates, about a minute today. That is the point of the hook: the alternative is finding failures in the PR.
- [Existing commits on this branch don't follow the new format (no `Refs:` footer, some headers > 72)] → commitlint only checks new commits. History is not rewritten.
- [`--no-verify` skips every hook] → covered by the CLAUDE.md rule now, and mechanically by DEV-1002's PreToolUse hook later.
- [The guideline rules flag existing code (double quotes everywhere, default exports, missing return types)] → task 11.4 fixes it in one mechanical commit; `prettier --write` does most of it.
- [`@mindfiredigital/eslint-plugin-hub` was last released in July 2025 and pulls in heavy dependencies (babel, pdfkit, json2csv)] → it is dev-only and pinned. If it misbehaves under ESLint 10, the fallback in D15 applies.
- [The secret check uses simple patterns and can miss secrets] → it targets the obvious cases (NFR-SEC-005). Secrets still come only from env (SDS §7.4).

## Migration Plan

1. Run `pnpm install` after pulling. This also installs the Git hooks.
2. Copy the new `.env.example` values to local `.env` files: port 5433, `dev/dev`, `tracker`.
3. `pnpm db:down` (old container), then `pnpm db:up`.

Rollback: see proposal.md.

## Open Questions

- None that block the tasks. The exact Docker patch tags are chosen in task 7.1 (see Risks).
