# Tasks

## 1. Root

- [x] 1.1 Add dev dependencies (typescript, vitest, eslint, prettier, concurrently) to root package.json and configure workspace scripts (dev, test, typecheck, build, db:up, db:down). Verify `pnpm install` succeeds.
- [x] 1.2 Create root vitest.config.ts for workspace-wide test configuration. Verify `pnpm test` runs (exits 0 with no tests).
- [x] 1.3 Add .gitignore entries for node_modules, dist, .env, and coverage. Verify `git status` does not show ignored files.

## 2. Shared

- [x] 2.1 Create packages/shared with package.json (@app/shared), tsconfig.json extending base, and src/index.ts. Verify `pnpm --filter @app/shared build` produces dist/index.js.
- [x] 2.2 Add zod dependency and implement HealthResponseSchema (status: "ok" | "error") and ErrorResponse type ({ error: { code: string, message: string } }). Verify `pnpm --filter @app/shared typecheck` passes.
- [x] 2.3 Add unit test for HealthResponseSchema validation (valid and invalid inputs). Verify `pnpm --filter @app/shared test` passes.

## 3. Database

- [x] 3.1 Create packages/database with package.json (@app/database), tsconfig.json, and add sequelize, pg, pg-hstore dependencies. Verify `pnpm --filter @app/database build` succeeds.
- [x] 3.2 Create src/index.ts exporting a Sequelize instance configured from DATABASE_URL env var and a connectDatabase() async function that authenticates the connection. Verify `pnpm --filter @app/database typecheck` passes.
- [x] 3.3 Set up sequelize-cli: add .sequelizerc (CommonJS, points to config/config.js), create config/config.js reading DATABASE_URL, create empty migrations folder. Verify `pnpm --filter @app/database exec sequelize-cli db:migrate:status` runs without syntax errors.
- [x] 3.4 Create packages/database/.env.example documenting DATABASE_URL. Verify file exists with example value.

## 4. Auth

- [x] 4.1 Create services/auth with package.json (name: auth), tsconfig.json, and add express, @types/express, @app/shared, @app/database dependencies. Verify `pnpm --filter auth build` succeeds.
- [x] 4.2 Create src/app.ts with Express app exposing GET /health that calls connectDatabase() and returns HealthResponse format (200 ok or 503 error). Verify `pnpm --filter auth typecheck` passes.
- [x] 4.3 Create src/index.ts that imports app and listens on PORT env var (default 4001). Verify `pnpm --filter auth build` produces runnable dist/index.js.
- [x] 4.4 Add supertest, @types/supertest and create src/app.test.ts testing GET /health returns 200 with { status: "ok" } when DB mocked as connected. Verify `pnpm --filter auth test` passes.
- [x] 4.5 Create services/auth/.env.example documenting PORT and DATABASE_URL. Verify file exists.

## 5. Gateway

- [x] 5.1 Create services/api-gateway with package.json (name: api-gateway), tsconfig.json, and add express, @types/express, http-proxy-middleware, @app/shared dependencies. Verify `pnpm --filter api-gateway build` succeeds.
- [x] 5.2 Create src/app.ts with Express app: GET /health returns { status: "ok" }, proxy /api/v1/auth/* to http://localhost:4001 (AUTH_SERVICE_URL env var). Verify `pnpm --filter api-gateway typecheck` passes.
- [x] 5.3 Create src/index.ts that imports app and listens on PORT env var (default 4000). Verify `pnpm --filter api-gateway build` produces runnable dist/index.js.
- [x] 5.4 Add supertest and create src/app.test.ts testing GET /health returns 200 with { status: "ok" }. Verify `pnpm --filter api-gateway test` passes.
- [x] 5.5 Create services/api-gateway/.env.example documenting PORT and AUTH_SERVICE_URL. Verify file exists.

## 6. Web

- [x] 6.1 Scaffold apps/web using Vite React TypeScript template (pnpm create vite or manual setup). Verify `pnpm --filter web dev` starts Vite dev server.
- [x] 6.2 Configure vite.config.ts with proxy: /api -> http://localhost:4000. Verify proxy config is present in file.
- [x] 6.3 Replace App.tsx with component that fetches GET /api/v1/health on mount and displays "API: online" or "API: offline" based on response. Verify `pnpm --filter web build` succeeds.
- [x] 6.4 Add @app/shared dependency and use HealthResponseSchema to validate the API response. Verify `pnpm --filter web typecheck` passes.

## 7. Docker

- [x] 7.1 Create docker-compose.yml with postgres:16 service (named volume pgdata, healthcheck using pg_isready, expose 5432). Verify `pnpm db:up` starts container and `pnpm db:down` stops it.
- [x] 7.2 Create services/auth/Dockerfile (multi-stage: build with pnpm, run with node:22-slim). Verify `docker build -f services/auth/Dockerfile .` succeeds.
- [x] 7.3 Create services/api-gateway/Dockerfile (multi-stage: build with pnpm, run with node:22-slim). Verify `docker build -f services/api-gateway/Dockerfile .` succeeds.
- [x] 7.4 Create apps/web/Dockerfile (multi-stage: build with pnpm/vite, serve with nginx). Verify `docker build -f apps/web/Dockerfile .` succeeds.

## 8. Integration

- [x] 8.1 Run `pnpm typecheck` from root and verify all packages pass type checking.
- [x] 8.2 Run `pnpm test` from root and verify all tests pass.
- [x] 8.3 Run `pnpm db:up && pnpm dev` and verify auth (:4001/health), gateway (:4000/health), and web (:5173) all respond. Web page shows "API: online".

## Workflow follow-up

- Archive the change after all tasks are verified and the project's review requirements are satisfied.
- Verify the archived result with `/opsx:verify`.
