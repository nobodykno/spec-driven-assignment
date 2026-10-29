# Tasks: DEV-1 Project setup

Rules for every task:
- Write the test first and watch it fail, then implement.
- Test names start with the FRS ID, e.g. `it('FR-SYS-001: ...')`.
- One commit per task: `feat(DEV-1): <n.m> <summary>` (or `chore`/`docs`/`test`).

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
- [ ] 5.3 Test first, then implement:
  - `FR-SYS-001: /api/v1/auth/* returns 503 SERVICE_UNAVAILABLE without internal details when auth is unreachable`: point `authServiceUrl` at `http://127.0.0.1:1` and assert the body has no `127.0.0.1` and no stack
  - `FR-SYS-001: /api/v1/auth/health is forwarded to auth /health`: use a stub upstream Express app on an ephemeral port
  - implement http-proxy-middleware v4 with `on.error` (D5) and confirm the v4 API in the docs
  - verify: `pnpm --filter api-gateway test`
  - **[FR-SYS-001]**

## 6. Tracker [PARALLEL with 4, 5, 8 after group 3] (FR-SYS-001, NFR-MNT-001)

- [ ] 6.1 Scaffold `services/tracker`:
  - `package.json` with the same pinned dependencies as auth
  - `tsconfig.json`, `vitest.config.ts`, `.env.example` with `PORT=4002`
  - write `src/app.test.ts` with the four auth-equivalent tests from 4.1
  - verify: `pnpm install && pnpm --filter tracker test` fails
- [ ] 6.2 Implement the tracker `createApp({ checkDatabase })` with the D4 layout and `index.ts` (port 4002). Verify: `pnpm --filter tracker test && pnpm --filter tracker build`. **[FR-SYS-001, NFR-MNT-001]**

## 7. Docker (NFR-OPS-001)

- [ ] 7.1 Choose the exact image tags:
  - `postgres:16.<minor>-alpine`, `node:22.<minor>.<patch>-alpine`, `nginx:1.<minor>.<patch>-alpine`
  - confirm each with `docker pull <tag>`
  - verify: all three pulls exit 0
  - **[NFR-OPS-001]**
- [ ] 7.2 Rewrite the `postgres` service in `docker-compose.yml` (D9: exact tag, `5433:5432`, `tracker_pgdata`, `dev/dev/tracker`, healthcheck) and set `db:up` to use `--wait`. Verify: `pnpm db:up` exits 0, `docker compose ps postgres` shows `healthy`, and `psql postgresql://dev:dev@localhost:5433/tracker -c 'select 1'` (or `pg_isready -h localhost -p 5433`) succeeds. **[NFR-OPS-001]**
- [ ] 7.3 Write or rewrite the Dockerfiles for auth, tracker, api-gateway and web (D9):
  - exact base tags, `pnpm@11.28.9`
  - no `|| true`, `pnpm deploy --prod`
  - non-root user
  - verify: `pnpm check:versions` exits 0 with no findings
  - **[NFR-OPS-001]**
- [ ] 7.4 Add the auth, tracker, api-gateway and web services to `docker-compose.yml`. Only 4000, 8080 and 5433 are published, and auth/tracker wait for a healthy postgres. Verify:
  - `docker compose up --build -d --wait` exits 0
  - `curl -s localhost:4000/health` returns `{"status":"ok"}`
  - `curl -s localhost:4000/api/v1/auth/health` returns `{"status":"ok"}`
  - `curl localhost:4001` is refused
  - **[NFR-OPS-001, FR-SYS-001]**
- [ ] 7.5 Check the database-down path end to end:
  - with the stack up, `docker compose stop postgres`, then `curl -s -w '%{http_code}' localhost:4000/api/v1/auth/health` prints `{"status":"error"}503` within 3s
  - `docker compose start postgres` and the same call returns 200
  - verify: the commands above
  - **[FR-SYS-001]**

## 8. Web [PARALLEL with 4, 5, 6 after group 2] (FR-SYS-002)

- [ ] 8.1 Upgrade web to React 19 and Vite 8 (pinned), and add `vitest.config.ts` (jsdom), RTL and `test`/`lint` scripts. Write `src/App.test.tsx` before changing `App.tsx`:
  - `FR-SYS-002: shows API: online when health is ok`
  - `FR-SYS-002: shows API: offline on 503`
  - `FR-SYS-002: shows API: offline on network error`
  - `FR-SYS-002: shows API: offline on unexpected body`
  - `FR-SYS-002: shows loading while pending`
  - verify: `pnpm --filter web test` runs (and the cases that are not implemented yet fail)
- [ ] 8.2 Update `App.tsx`/`main.tsx` for React 19 to meet 8.1 and keep the Vite `/api` proxy to `:4000`. Verify: `pnpm --filter web test && pnpm --filter web build`, then with `pnpm db:up && pnpm dev` open http://localhost:5173 and see "API: online". Stop the gateway and reload to see "API: offline". **[FR-SYS-002]**

## 9. Docs (NFR-OPS-001)

- [ ] 9.1 Create `docs/versions.md` listing:
  - every pinned npm package and its exact version
  - Node 22.x and pnpm 11.28.9
  - the three Docker image tags from 7.1
  - how versions were checked (D12) and the local-dev migration note (port 5433, `dev/dev/tracker`)
  - verify: every dependency in every `package.json` appears in the file with the same version (compare the files and note the comparison in the commit)
  - **[NFR-OPS-001]**
- [ ] 9.2 Delete the superseded change `openspec/changes/project-setup` and update `CLAUDE.md` Commands if a script name changed. Verify: `openspec list` shows only `dev-1-project-setup`. **[NFR-MNT-001]**

## 10. Quality gates (all IDs)

- [ ] 10.1 Run the full gates from a clean install: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test`. Every command exits 0 with Postgres stopped. **[NFR-MNT-001, NFR-OPS-001, FR-SYS-001, FR-SYS-002]**
- [ ] 10.2 Run `openspec validate dev-1-project-setup --strict` and check that every spec scenario has a matching test name or a 7.x/8.2 manual verification step. Verify: validate exits 0. **[all]**

## Workflow follow-up

- `/sdd:verify DEV-1 project-setup` in a fresh session (gates, reviewer subagent, traceability).
- `/sdd:ship DEV-1 project-setup` to push and open the PR.
- After merge: `/opsx:archive dev-1-project-setup`.
