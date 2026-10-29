Ticket: DEV-1
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-1 Project setup

> Jira issue `DEV-1` is titled "[DEV-1001] Project setup". The FRS traceability table (§5) refers to this ticket as **DEV-1001**. Both keys mean the same ticket.

## Why

The repository already has a scaffold from an earlier, pre-workflow change (`openspec/changes/project-setup`). That scaffold doesn't meet the ticket or the SDS:
- Express 4 and React 18 are used instead of Express 5 and React 19.
- Every dependency uses a `^` range, and the Docker files use `postgres:16` and `pnpm@latest`.
- Postgres runs on host port 5432 instead of 5433.
- There is no `tracker` service, no lint or Prettier setup, and no `docs/versions.md`.
- The auth Dockerfile hides install errors with `|| true`.
- The web app requests `/api/v1/health`, which the gateway does not serve, so the page always shows "offline".

Every later ticket (DEV-1006 onwards) builds on this foundation, so it has to be correct and fully gated first.

## FRS requirements covered

| ID | Coverage |
| --- | --- |
| FR-SYS-001 | `GET /health` on gateway, auth and tracker; 503 when the database is down |
| FR-SYS-002 | **(new in DEV-1)** Gateway exposes `GET /api/v1/health`; the web app shows "API: online" / "API: offline". Added to `docs/FRS.md` in this change |
| NFR-OPS-001 | Docker Compose stack with exact image tags; `pnpm db:up` starts PostgreSQL 16 on host port 5433 and it becomes healthy; no floating versions anywhere |
| NFR-MNT-001 | TypeScript strict, ESLint (no `any`, no `@ts-ignore`), Prettier check, Vitest, all wired into root `build` / `lint` / `typecheck` / `test` |

## SDS sections followed / changed

- **Followed:** §2.1 Components and ports · §3 Repository structure · §3.1 `app.ts` / `index.ts` split · §4 Technology stack · §5.4 Migrations (sequelize-cli; no `sync()`) · §6.1 Error format · §6.4 Error codes · §10 Central error middleware · §11 Testing strategy · §12 Docker Compose, Dockerfiles, environment variables
- **Changed (SDS updated in this change):**
  - §6.2: add gateway `GET /api/v1/health` (FR-SYS-002)
  - §11: `pnpm test` runs each workspace's own Vitest config

## What Changes

- **Root tooling:**
  - Pin exact versions and set `packageManager`.
  - Add `lint`, `format`, `db:migrate` and `check:versions` scripts.
  - `test` runs `pnpm -r test`.
  - Add the ESLint flat config and Prettier config.
  - Add a script that fails on any floating npm range or Docker tag.
- **packages/shared:**
  - `HealthResponseSchema`.
  - `ErrorCodeSchema` with every code from SDS §6.4, plus `ErrorResponseSchema`.
  - Tests for both.
- **packages/database:**
  - The Sequelize instance reads `DATABASE_URL` (default host port 5433).
  - Add `checkDatabase()`, which returns true or false within a timeout and never throws.
  - Add a sequelize-cli config and an empty migrations/seeders setup.
  - Remove `console.log` from the library.
- **services/auth:** upgrade to Express 5. `/health` uses `checkDatabase()`. Add the central error middleware.
- **services/tracker (new):** Express 5 on port 4002, with `/health` and the error middleware. Same layout as auth.
- **services/api-gateway:**
  - Upgrade to Express 5.
  - Serve `/health` and `/api/v1/health` directly.
  - Proxy `/api/v1/auth/*` to auth (existing). Tracker proxying arrives with DEV-1007.
  - Return 503 `SERVICE_UNAVAILABLE` when a downstream service is unreachable.
- **apps/web:**
  - Upgrade to React 19 and Vite 8.
  - Render "API: online" / "API: offline" from `GET /api/v1/health`.
  - Add a Vitest + React Testing Library test.
  - Stop tracking the committed `tsconfig.tsbuildinfo`.
- **Docker:**
  - `docker-compose.yml`: PostgreSQL 16 on 5433 with an exact tag, a named volume, a healthcheck and `dev`/`dev`/`tracker` credentials.
  - Add the auth, tracker, gateway and web services.
  - Dockerfiles: pin node and pnpm versions, drop `|| true`, and run as a non-root user.
- **Docs:**
  - New `docs/versions.md`.
  - FRS: add FR-SYS-002 and update the traceability table.
  - SDS updates as listed above.
  - Delete the superseded `openspec/changes/project-setup` so its conflicting specs are never archived.

## Capabilities

### New Capabilities
- `service-health`: health endpoints of the backend services and the gateway, including the database dependency check (FR-SYS-001, FR-SYS-002).
- `web-api-status`: the web app's API connectivity indicator (FR-SYS-002).
- `local-environment`: starting PostgreSQL and the stack locally with pinned, reproducible versions (NFR-OPS-001).
- `quality-gates`: root build, lint, typecheck and test commands and the rules they enforce (NFR-MNT-001).

### Modified Capabilities
- None. `openspec/specs/` is empty.

## Affected packages / services

Root workspace · `packages/shared` · `packages/database` · `services/auth` · `services/tracker` (new) · `services/api-gateway` · `apps/web` · `docker-compose.yml` and Dockerfiles · `docs/`

## New / changed dependencies (exact versions)

Every existing `^` range becomes an exact pin. Versions were checked with `pnpm view` on 2026-10-29.

| Package | Version | Where | Reason |
| --- | --- | --- | --- |
| express | 5.3.0 | auth, tracker, gateway | Express 5 (SDS §4); **upgrade** from 4.x |
| @types/express | 5.0.6 | auth, tracker, gateway | Types |
| http-proxy-middleware | 4.2.1 | gateway | Proxying (existing; upgrade 3 → 4) |
| zod | 4.6.7 | shared | Schemas (existing; pin) |
| sequelize | 6.37.8 | database | ORM (existing; pin) |
| pg | 8.23.1 | database | Postgres driver (existing; pin) |
| pg-hstore | 2.3.4 | database | Sequelize peer (existing; pin) |
| sequelize-cli | 6.6.5 | database (dev) | Migrations (existing; pin) |
| react, react-dom | 19.3.1 | web | React 19; **upgrade** from 18 |
| @types/react, @types/react-dom | 19.3.0 | web (dev) | Types |
| vite | 8.3.5 | web (dev) | Build/dev server; upgrade 6 → 8 |
| @vitejs/plugin-react | 6.1.2 | web (dev) | Requires vite ^8 |
| typescript | 5.9.3 | root (dev) | typescript-eslint 8.72 supports TS <6.1, so TS 7 is not used |
| vitest | 5.0.5 | root (dev) | Test runner (existing; pin) |
| supertest | 7.3.1 / @types/supertest 7.2.1 | services (dev) | HTTP tests (existing; pin) |
| tsx | 4.23.15 | services (dev) | Dev runner (existing; pin) |
| @types/node | 22.20.5 | all Node packages (dev) | Matches Node 22 runtime (was 26.x) |
| concurrently | 10.0.6 | root (dev) | `pnpm dev` (existing; pin) |
| eslint | 10.13.0 | root (dev) | Lint (existing; pin) |
| @eslint/js | 10.0.1 | root (dev) | **New.** Base recommended rules |
| typescript-eslint | 8.72.1 | root (dev) | **New.** TS rules: `no-explicit-any`, `ban-ts-comment` |
| eslint-plugin-react-hooks | 7.1.1 | root (dev) | **New.** Hooks rules for web |
| eslint-config-prettier | 10.1.8 | root (dev) | **New.** Turns off rules that conflict with Prettier |
| globals | 17.13.0 | root (dev) | **New.** Browser/node globals for flat config |
| prettier | 3.9.10 | root (dev) | Format check (existing; pin) |
| jsdom | 30.1.3 | web (dev) | **New.** DOM environment for component tests |
| @testing-library/react | 16.3.3 | web (dev) | **New.** Component tests (SDS §11) |
| @testing-library/dom | 10.4.2 | web (dev) | **New.** Peer of RTL |
| pnpm (packageManager) | 11.28.9 | root | Pinned package manager (matches local install) |

Docker images (exact tags confirmed with `docker pull` in task 7.1 and recorded in `docs/versions.md`):
- `postgres:16.x-alpine`
- `node:22.x-alpine`
- `nginx:1.x-alpine`

## Database changes

None. No tables, columns, indexes or migrations. This change only sets up the connection, the sequelize-cli config and the empty `migrations/` and `seeders/` folders.

## Ticket dependencies

None. Jira DEV-1 lists "Dependencies: none", so nothing blocks this ticket.

## Rollback plan

All work happens on `feature/DEV-1-project-setup`, one commit per task.
- **Before merge:** delete the branch.
- **After merge:** `git revert` the merge commit, then `pnpm install` and `pnpm db:down`.
- Remove the `tracker_pgdata` volume (`docker volume rm`) if a clean database is wanted.

The database has no schema yet, so there is no data migration to undo.

## Impact

- **APIs:**
  - `GET /health` on :4000, :4001 and :4002.
  - `GET /api/v1/health` on the gateway.
  - Existing proxy `/api/v1/auth/*`.
- **Breaking (local dev only):** Postgres moves from host port 5432 to 5433, and the credentials change to `dev/dev`, database `tracker`. Local `.env` files must be updated from the `.env.example` files.
