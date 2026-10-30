# Tasks: DEV-1 Project setup

Rules for every task:
- Write the test first and watch it fail, then implement.
- Test names start with the FRS ID, e.g. `it('FR-SYS-001: ...')`.
- One commit per task: `feat(DEV-1): <n.m> <summary>` (or `chore`/`docs`/`test`). Once group 9 is in, every commit also needs the footer `Refs: DEV-1`, and the header is at most 72 characters. From task 11.7 on, the scope is an area instead of the ticket key: `feat(web): 8.3 add playwright check` + `Refs: DEV-1`.

`[PARALLEL]` marks groups that can run in separate worktrees once their prerequisites are done.

## 1. Root workspace (NFR-OPS-001, NFR-MNT-001)

- [x] 1.1 Write `scripts/check-versions.test.mjs`:
  - fixtures with `^`, `~`, `latest`, `postgres:16`, `node:22-slim` and `pnpm@latest` must fail
  - exact pins and `workspace:*` must pass
  - test names start with `NFR-OPS-001:`
  - verify: `pnpm exec vitest run --dir scripts` fails (no implementation yet)
- [x] 1.2 Implement `scripts/check-versions.mjs` (design D8) and add the root script `check:versions`. Verify: `pnpm exec vitest run --dir scripts` passes. **[NFR-OPS-001]**
- [x] 1.3 Pin exact versions in every workspace `package.json`, using the proposal's dependency table:
  - add `"packageManager": "pnpm@11.28.9"` and `engines.node`
  - remove `devEngines`, `main` and other `npm init` leftovers from the root
  - verify: `pnpm install` exits 0 and `pnpm check:versions` reports only the Docker findings that group 7 fixes
  - **[NFR-OPS-001]**
- [x] 1.4 Add the root configs:
  - `eslint.config.js` (design D7), `.prettierrc.json`, `.prettierignore`
  - root scripts `lint`, `format`, `test`, `db:migrate` (design D6)
  - remove the root `vitest.config.ts`
  - format the existing files once
  - verify: add a throwaway file containing `const x: any = 1` and `// @ts-ignore`, confirm `pnpm exec eslint` reports `no-explicit-any` and `ban-ts-comment`, delete the file, then confirm `pnpm exec eslint . && pnpm exec prettier --check .` exits 0
  - **[NFR-MNT-001]**
- [x] 1.5 Stop tracking `apps/web/tsconfig.tsbuildinfo` and add `*.tsbuildinfo` to `.gitignore`. Verify: `git ls-files | grep tsbuildinfo` prints nothing. **[NFR-MNT-001]**

## 2. Shared (FR-SYS-001, NFR-MNT-001)

- [x] 2.1 Write `packages/shared/src/schemas/common.test.ts` first, covering:
  - `FR-SYS-001`: `HealthResponseSchema` accepts ok/error and rejects other values
  - `NFR-MNT-001`: `ErrorResponseSchema` accepts every SDS §6.4 code and rejects `SOMETHING_ELSE`
  - `NFR-MNT-001`: `AppError` keeps `code`, `status` and `details`
  - verify: `pnpm --filter @app/shared test` fails
- [x] 2.2 Implement:
  - `src/schemas/common.ts` (health schema)
  - `src/errors.ts` (`ErrorCodeSchema`, `ErrorResponseSchema`, `AppError`)
  - re-export from `src/index.ts` and delete the old `index.test.ts`
  - add `vitest.config.ts`
  - verify: `pnpm --filter @app/shared test && pnpm --filter @app/shared build`
  - **[FR-SYS-001, NFR-MNT-001]**

## 3. Database (FR-SYS-001)

- [x] 3.1 Write `packages/database/src/health.test.ts`. `FR-SYS-001: checkDatabase returns false within 3s when the database is unreachable` uses `postgresql://x:x@127.0.0.1:1/x`. Verify: `pnpm --filter @app/database test` fails.
- [x] 3.2 Implement in `packages/database`:
  - a lazy `getSequelize()` from `DATABASE_URL` (default host port 5433, `dev/dev/tracker`)
  - `checkDatabase(timeoutMs)` (design D2)
  - remove `console.log`
  - update `config/config.cjs` defaults and `.env.example`
  - add a `migrate` script (sequelize-cli) and keep `migrations/` and `seeders/` with `.gitkeep`
  - verify: `pnpm --filter @app/database test && pnpm --filter @app/database build`
  - **[FR-SYS-001]**

## 4. Auth [PARALLEL with 5, 6, 8 after group 3] (FR-SYS-001, NFR-MNT-001)

- [x] 4.1 Rewrite `services/auth/src/app.test.ts` against `createApp({ checkDatabase })` before changing the code. Tests:
  - `FR-SYS-001: GET /health returns 200 ok when the database is reachable`
  - `FR-SYS-001: GET /health returns 503 error when the database is down`
  - `FR-SYS-001: unknown path returns 404 NOT_FOUND`
  - `NFR-MNT-001: unexpected error returns 500 INTERNAL_ERROR without stack`
  - verify: `pnpm --filter auth test` fails
- [x] 4.2 Upgrade auth to Express 5 with the D4 layout: `app.ts` exports `createApp`, plus routes/health, controllers/health and middleware/error-handler. `index.ts` wires the real `checkDatabase` and `PORT` (default 4001). Update the dev script (D10) and `.env.example`. Verify: `pnpm --filter auth test && pnpm --filter auth typecheck`. **[FR-SYS-001, NFR-MNT-001]**

## 5. Gateway [PARALLEL with 4, 6, 8 after group 2] (FR-SYS-001, FR-SYS-002)

- [x] 5.1 Rewrite `services/api-gateway/src/app.test.ts` first. Tests:
  - `FR-SYS-001: GET /health returns 200 ok`
  - `FR-SYS-002: GET /api/v1/health returns 200 ok`
  - `FR-SYS-002: unknown /api/v1 path returns 404 NOT_FOUND`
  - `FR-SYS-001: GET /health is 200 while auth is down`
  - verify: `pnpm --filter api-gateway test` fails
- [x] 5.2 Upgrade the gateway to Express 5 with `createApp({ authServiceUrl })`, health routes on `/health` and `/api/v1/health`, a 404 handler and the error middleware. Verify: the 5.1 tests pass with `pnpm --filter api-gateway test`. **[FR-SYS-001, FR-SYS-002]**
- [x] 5.3 Test first, then implement:
  - `FR-SYS-001: /api/v1/auth/* returns 503 SERVICE_UNAVAILABLE without internal details when auth is unreachable`: point `authServiceUrl` at `http://127.0.0.1:1` and assert the body has no `127.0.0.1` and no stack
  - `FR-SYS-001: /api/v1/auth/health is forwarded to auth /health`: use a stub upstream Express app on an ephemeral port
  - implement http-proxy-middleware v4 with `on.error` (D5) and confirm the v4 API in the docs
  - verify: `pnpm --filter api-gateway test`
  - **[FR-SYS-001]**

## 6. Tracker [PARALLEL with 4, 5, 8 after group 3] (FR-SYS-001, NFR-MNT-001)

- [x] 6.1 Scaffold `services/tracker`:
  - `package.json` with the same pinned dependencies as auth
  - `tsconfig.json`, `vitest.config.ts`, `.env.example` with `PORT=4002`
  - write `src/app.test.ts` with the four auth-equivalent tests from 4.1
  - verify: `pnpm install && pnpm --filter tracker test` fails
- [x] 6.2 Implement the tracker `createApp({ checkDatabase })` with the D4 layout and `index.ts` (port 4002). Verify: `pnpm --filter tracker test && pnpm --filter tracker build`. **[FR-SYS-001, NFR-MNT-001]**

## 7. Docker (NFR-OPS-001)

- [x] 7.1 Choose the exact image tags (chosen 2026-10-30: `postgres:16.15-alpine`, `node:22.23.4-alpine`, `nginx:1.31.8-alpine`):
  - `postgres:16.<minor>-alpine`, `node:22.<minor>.<patch>-alpine`, `nginx:1.<minor>.<patch>-alpine`
  - confirm each with `docker pull <tag>`
  - verify: all three pulls exit 0
  - **[NFR-OPS-001]**
- [x] 7.2 Rewrite the `postgres` service in `docker-compose.yml` (D9: exact tag, `5433:5432`, `tracker_pgdata`, `dev/dev/tracker`, healthcheck) and set `db:up` to use `--wait`. Verify: `pnpm db:up` exits 0, `docker compose ps postgres` shows `healthy`, and `psql postgresql://dev:dev@localhost:5433/tracker -c 'select 1'` (or `pg_isready -h localhost -p 5433`) succeeds. **[NFR-OPS-001]**
- [x] 7.3 Write or rewrite the Dockerfiles for auth, tracker, api-gateway and web (D9):
  - exact base tags, `pnpm@11.28.9`
  - no `|| true`, `pnpm deploy --prod`
  - `ENV HUSKY=0` before `pnpm install` (design D13)
  - non-root user
  - verify: `pnpm check:versions` exits 0 with no findings
  - **[NFR-OPS-001]**
- [x] 7.4 Add the auth, tracker, api-gateway and web services to `docker-compose.yml`. Only 4000, 8080 and 5433 are published, and auth/tracker wait for a healthy postgres. Verify:
  - `docker compose up --build -d --wait` exits 0
  - `curl -s localhost:4000/health` returns `{"status":"ok"}`
  - `curl -s localhost:4000/api/v1/auth/health` returns `{"status":"ok"}`
  - `curl localhost:4001` is refused
  - **[NFR-OPS-001, FR-SYS-001]**
- [x] 7.5 Check the database-down path end to end:
  - with the stack up, `docker compose stop postgres`, then `curl -s -w '%{http_code}' localhost:4000/api/v1/auth/health` prints `{"status":"error"}503` within 3s
  - `docker compose start postgres` and the same call returns 200
  - verify: the commands above
  - **[FR-SYS-001]**

## 8. Web [PARALLEL with 4, 5, 6 after group 2] (FR-SYS-002)

- [x] 8.1 Upgrade web to React 19 and Vite 8 (pinned), and add `vitest.config.ts` (jsdom), RTL and `test`/`lint` scripts. Write `src/App.test.tsx` before changing `App.tsx`:
  - `FR-SYS-002: shows API: online when health is ok`
  - `FR-SYS-002: shows API: offline on 503`
  - `FR-SYS-002: shows API: offline on network error`
  - `FR-SYS-002: shows API: offline on unexpected body`
  - `FR-SYS-002: shows loading while pending`
  - verify: `pnpm --filter web test` runs (and the cases that are not implemented yet fail)
- [x] 8.2 Update `App.tsx`/`main.tsx` for React 19 to meet 8.1 and keep the Vite `/api` proxy to `:4000`. Verify: `pnpm --filter web test && pnpm --filter web build`. The browser check is task 8.3. **[FR-SYS-002]**

- [x] 8.3 Browser check with Playwright (design D14):
  - add `@playwright/test@1.64.1` (root, dev), `playwright.config.ts`, `e2e/web-api-status.spec.ts`, the root script `test:e2e`, and git-ignore `test-results/` and `playwright-report/`
  - `pnpm exec playwright install chromium`
  - with Postgres, auth, gateway and the web dev server running in the background: `E2E_EXPECT=online pnpm test:e2e` passes and saves `docs/evidence/DEV-1/web-api-online.png`
  - stop the gateway: `E2E_EXPECT=offline pnpm test:e2e` passes and saves `docs/evidence/DEV-1/web-api-offline.png`
  - stop the background processes
  - verify: both runs exit 0 and both screenshots exist
  - **[FR-SYS-002]**

## 9. Git hooks (NFR-MNT-001, NFR-SEC-005)

- [x] 9.1 Add the pinned dev dependencies `husky@9.1.7`, `lint-staged@17.6.0`, `@commitlint/cli@21.2.4` and `@commitlint/config-conventional@21.2.4`, raise root `engines.node` to `>=22.22.1 <23`, and add `"prepare": "husky"`. Run `pnpm install`. Verify: `pnpm check:versions` exits 0 and `git config core.hooksPath` prints `.husky/_`. **[NFR-MNT-001]**
- [x] 9.2 Write `scripts/check-staged-secrets.test.mjs` first. Fixtures are built by concatenation, and tests cover:
  - `NFR-SEC-005: rejects .env, nested .env and .env.production`
  - `NFR-SEC-005: allows .env.example`
  - `NFR-SEC-005: rejects a private key block`
  - `NFR-SEC-005: rejects JWT_SECRET with a real value and allows placeholders`
  - `NFR-SEC-005: rejects AWS-style access and secret keys`
  - `NFR-SEC-005: findings never contain the secret value`
  - verify: `pnpm exec vitest run --dir scripts` fails
- [x] 9.3 Implement `scripts/check-staged-secrets.mjs` (D13: `findSecrets` plus a CLI over staged blobs). Verify: `pnpm exec vitest run --dir scripts` passes. Then in a scratch commit, `git add -f` a `.env` and confirm the hook (after 9.6) or `node scripts/check-staged-secrets.mjs` exits non-zero, and unstage it. **[NFR-SEC-005]**
- [x] 9.4 Write `scripts/commitlint.test.mjs` first. It runs the real commitlint CLI with stdin and `COMMITLINT_BRANCH`, and tests:
  - `NFR-MNT-001: accepts feat(DEV-9) with Refs: DEV-9`
  - `NFR-MNT-001: rejects a message without a Jira scope`
  - `NFR-MNT-001: rejects a non-Jira scope`
  - `NFR-MNT-001: rejects a missing or mismatched Refs footer`
  - `NFR-MNT-001: rejects an unknown type, a header over 72, a capitalised subject, a trailing period, a body line over 72`
  - `NFR-MNT-001: allows unscoped docs:/chore: on main only`
  - verify: `pnpm exec vitest run --dir scripts` fails (no config yet)
- [x] 9.5 Implement `commitlint.config.mjs` with the local plugin (D13). Verify: `pnpm exec vitest run --dir scripts` passes. **[NFR-MNT-001]**
- [x] 9.6 Add `lint-staged.config.mjs` and the hooks `.husky/pre-commit`, `.husky/commit-msg` and `.husky/pre-push` (D13). Verify by hand on a scratch branch, then delete it:
  - a staged file with only bad formatting is fixed and committed
  - a staged `const x: any = 1` is rejected by ESLint
  - `git commit -m "feat: x"` is rejected by commitlint
  - a deliberately failing test makes `git push --dry-run` fail in pre-push
  - **[NFR-MNT-001, NFR-SEC-005]**

## 10. Docs (NFR-OPS-001, NFR-MNT-001, NFR-SEC-005)

- [ ] 10.1 Create `docs/versions.md` listing:
  - every pinned npm package and its exact version, including the Git-hook tools from 9.1
  - Node 22.x and pnpm 11.28.9
  - the three Docker image tags from 7.1
  - how versions were checked (D12) and the local-dev migration note (port 5433, `dev/dev/tracker`)
  - verify: every dependency in every `package.json` appears in the file with the same version (compare the files and note the comparison in the commit)
  - **[NFR-OPS-001]**
- [ ] 10.2 Delete the superseded change `openspec/changes/project-setup` and update `CLAUDE.md` Commands if a script name changed. Verify: `openspec list` shows only `dev-1-project-setup`. **[NFR-MNT-001]**
- [ ] 10.3 Update `CLAUDE.md` and the FRS:
  - a "Git hooks" section explaining each hook (pre-commit, commit-msg, pre-push)
  - the full commit convention (D15): types, area scopes, 72-character header, lowercase imperative subject, mandatory `Refs: DEV-N` footer
  - "Never bypass hooks with --no-verify. If a hook fails, fix the cause."
  - `docs/FRS.md` traceability: add NFR-SEC-005 to the DEV-1001 row
  - verify: read the section back against D13
  - **[NFR-MNT-001, NFR-SEC-005]**

## 11. Coding guidelines (NFR-MNT-001)

- [x] 11.1 Add `docs/CODING_GUIDELINES.md`. Add a "Coding guidelines" line to `CLAUDE.md` pointing to it, and add "code follows docs/CODING_GUIDELINES.md" to the checklist in `.claude/agents/reviewer.md`. Verify: the file exists and both references point to it. **[NFR-MNT-001]**
- [x] 11.2 Write `scripts/lint-rules.test.mjs` first (ESLint Node API on fixtures, D15). Each test asserts the rule id:
  - `NFR-MNT-001: clean guideline-style code passes`
  - `NFR-MNT-001: rejects double quotes and missing semicolons`
  - `NFR-MNT-001: rejects == and if without braces`
  - `NFR-MNT-001: rejects nesting deeper than 3 and complexity over 10`
  - `NFR-MNT-001: rejects a missing return type on an exported function`
  - `NFR-MNT-001: rejects a default export outside config files`
  - `NFR-MNT-001: rejects a file name that is not kebab-case`
  - `NFR-MNT-001: warns on console and on functions over 30 lines`
  - verify: `pnpm exec vitest run --dir scripts` fails
- [x] 11.3 Implement D15: update `eslint.config.js`, add `@mindfiredigital/eslint-plugin-hub@2.2.0` (or apply the documented fallback), and replace `.prettierrc.json` with `.prettierrc`. Verify: `pnpm exec vitest run --dir scripts` passes. **[NFR-MNT-001]**
- [ ] 11.4 Fix existing code: `pnpm format`, rename `apps/web/src/App.tsx` / `App.test.tsx` to `app.tsx` / `app.test.tsx` with a named `App` export, and add explicit return types and other manual fixes. Verify: `pnpm lint` exits 0 with zero errors, and `pnpm build && pnpm typecheck && pnpm test` pass. **[NFR-MNT-001]**
- [ ] 11.5 Add `.vscode/settings.json` and `.vscode/extensions.json` (D15) and update `.gitignore`. Verify: `git check-ignore .vscode/settings.json` prints nothing. **[NFR-MNT-001]**
- [ ] 11.6 Update `scripts/commitlint.test.mjs` first for the area-scope convention:
  - accepts `feat(auth): add login endpoint` + `Refs: DEV-9`
  - rejects a missing scope, an unknown scope (`feat(DEV-9)`), and a missing `Refs` footer, including on `main`
  - keeps the type, header, case, period and body-length cases
  - verify: the updated tests fail
- [ ] 11.7 Update `commitlint.config.mjs` (D15) and the convention text in `CLAUDE.md`, `.claude/commands/sdd/apply.md`, `.claude/commands/sdd/run.md` and this file's rules. Verify: `pnpm exec vitest run --dir scripts` passes, and the commit for this task passes the new hook. **[NFR-MNT-001]**

## 12. Quality gates (all IDs)

- [ ] 12.1 Run the full gates from a clean install: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test`. Every command exits 0 with Postgres stopped. Then make a real commit and push through the hooks, without `--no-verify`. **[NFR-MNT-001, NFR-SEC-005, NFR-OPS-001, FR-SYS-001, FR-SYS-002]**
- [ ] 12.2 Run `openspec validate dev-1-project-setup --strict` and check that every spec scenario has a matching test name or a 7.x/8.2/9.6 manual verification step. Verify: validate exits 0. **[all]**

## Workflow follow-up

- `/sdd:verify DEV-1 project-setup` in a fresh session (gates, reviewer subagent, traceability).
- `/sdd:ship DEV-1 project-setup` to push and open the PR.
- After merge: `/opsx:archive dev-1-project-setup`.
