# Design: DEV-1 Project setup

## Context

See proposal.md (Why) for the gaps in the existing scaffold. Here is what's already in place and what limits the design:
- pnpm workspaces are already set up for `apps/*`, `services/*` and `packages/*`.
- `tsconfig.base.json` uses `strict`, ES2022 and NodeNext, and every package is ESM (`"type": "module"`).
- The local toolchain is Node 22.23.1 and pnpm 11.28.9.
- `packages/database` is the only package allowed to import `sequelize` (CLAUDE.md).

Follows SDS §2.1, §3, §3.1, §4, §5.4, §6.1, §6.4, §10, §11 and §12.

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
- Playwright and e2e (DEV-1016). CI pipelines.

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

## Risks / Trade-offs

- [The http-proxy-middleware v4 API changed from v3] → task 5.3 is test-first: the 503 test fails until the `on.error` wiring is correct.
- [Exact Docker tags could not be looked up during planning, because Docker Hub access was denied] → task 7.1 picks the newest `16.x`, `22.x` and `1.x` alpine tags, confirms each with `docker pull`, and the version checker rejects anything that isn't exact.
- [Postgres moves from 5432 to 5433 and the credentials change, which breaks existing local `.env` files] → document this in `.env.example` and docs/versions.md. The new volume name avoids stale-credential errors.
- [The React 18 → 19 and Vite 6 → 8 jumps] → the web app is a single component, so the upgrade surface is minimal.
- [`pnpm deploy` behaviour in pnpm 11] → verified by `docker compose build` in task 7.4.
- [Deleting `openspec/changes/project-setup` removes history] → it remains in git history (commit a629415). Keeping it would mean its `health-check`/`api-routing` specs could be archived alongside, and conflict with, this change's specs.

## Migration Plan

1. Run `pnpm install` after pulling.
2. Copy the new `.env.example` values to local `.env` files: port 5433, `dev/dev`, `tracker`.
3. `pnpm db:down` (old container), then `pnpm db:up`.

Rollback: see proposal.md.

## Open Questions

- None that block the tasks. The exact Docker patch tags are chosen in task 7.1 (see Risks).
