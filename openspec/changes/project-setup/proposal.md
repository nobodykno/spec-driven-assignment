# Proposal

## Why

The project exists as an empty pnpm workspace without any packages, services, or tooling. Before any features can be built, the foundational infrastructure must be in place: dev tooling, shared packages, services skeleton, database connectivity, and Docker orchestration.

## What Changes

- **Root workspace**: Add dev dependencies (TypeScript, Vitest, ESLint, Prettier) and workspace scripts (dev, test, typecheck, build, db:up)
- **packages/shared** (`@app/shared`): TypeScript package exporting Zod schemas (`HealthResponseSchema`) and types (`ErrorResponse`)
- **packages/database** (`@app/database`): Sequelize + PostgreSQL connection, `connectDatabase()` helper, migrations folder, sequelize-cli config, `.env.example`
- **services/auth**: Express service on port 4001 with `GET /health` (checks DB connectivity), Supertest test
- **services/api-gateway**: Express service on port 4000 with `GET /health`, proxies `/api/v1/auth/*` to auth service, Supertest test
- **apps/web**: React + Vite + TypeScript app; home page calls `GET /api/v1/health` and shows "API: online" or "API: offline"
- **Docker**: `docker-compose.yml` with PostgreSQL 16 (named volume, healthcheck), Dockerfiles for auth, api-gateway, and web (nginx)

## Capabilities

### New Capabilities

- `health-check`: System health endpoint behavior - what services expose, response format, database connectivity check
- `api-routing`: API gateway routing - how requests flow from web to services, proxy rules, path prefixes

### Modified Capabilities

(None - this is a greenfield project with no existing specs)

## Impact

**Code**: Creates 6 new packages/services/apps from scratch

**Dependencies** (new npm packages):
| Package | Reason |
|---------|--------|
| `typescript` | TypeScript compiler for all packages |
| `vitest` | Test runner compatible with ESM |
| `eslint` | Linting |
| `prettier` | Code formatting |
| `zod` | Runtime schema validation for API contracts |
| `sequelize` | PostgreSQL ORM |
| `pg`, `pg-hstore` | PostgreSQL drivers for Sequelize |
| `sequelize-cli` | Database migrations tooling |
| `express` | HTTP server framework |
| `@types/express` | TypeScript types for Express |
| `supertest`, `@types/supertest` | HTTP testing for services |
| `http-proxy-middleware` | Request proxying in api-gateway |
| `react`, `react-dom` | React 18 for web app |
| `vite`, `@vitejs/plugin-react` | Dev server and build tool for web |
| `concurrently` | Run multiple dev servers in parallel |

**Database**: No tables or migrations in this change (infrastructure only). Sets up migrations folder for future changes.

**APIs**:
- `GET /health` on auth (port 4001) and api-gateway (port 4000)
- Proxy route `/api/v1/auth/*` from gateway to auth service

**Rollback plan**: Delete all created directories and remove root package.json scripts. The workspace config and tsconfig.base.json remain untouched.
