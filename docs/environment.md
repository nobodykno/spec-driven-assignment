# Environment variables

Names only: values come from the shell or an untracked env file and are never committed
(NFR-SEC-005, SDS §7.4). `docker-compose.yml` refuses to start without `JWT_SECRET` and
`INTERNAL_TOKEN`.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | auth, tracker, database | PostgreSQL connection (local default port 5433) |
| `JWT_SECRET` | auth (sign), api-gateway (verify) | HS256 access-token secret |
| `INTERNAL_TOKEN` | api-gateway, auth, tracker | Shared secret the gateway sends as `X-Internal-Token` |
| `AUTH_SERVICE_URL` | api-gateway | Auth upstream (default `http://localhost:4001`) |
| `TRACKER_SERVICE_URL` | api-gateway | Tracker upstream (default `http://localhost:4002`) |
| `WEB_ORIGIN` | api-gateway | Only origin allowed by CORS (default `http://localhost:5173`) |
| `PORT` | every service | Listen port |
| `LOG_LEVEL` | every service | pino level (default `info`) |
| `NODE_ENV` | auth | `production` makes the refresh cookie `Secure` |

Local run: export `JWT_SECRET` and `INTERNAL_TOKEN` (any long random strings) before `pnpm dev`.

Each service and `packages/database` ships a complete `.env.example`; copy it to a local env file
and replace every `change-me` value with a long random string.

The Docker stack does not run migrations. After `pnpm db:up`, run `pnpm db:migrate` (and `pnpm db:seed`
for the demo users) before starting the services, otherwise tracker requests fail with 500.

## Running the tests

- `pnpm test` needs Postgres: run `pnpm db:up` first. The tracker's authorization and regression
  tests use a separate database, `tracker_test`, which the test run creates and migrates itself
  (`pnpm --filter @app/database prepare:test-db`) and truncates between tests. The development
  database `tracker` is never touched; the script refuses a name that does not end in `_test`.
  Override with `TEST_DATABASE_URL`.
- `pnpm test:e2e` drives a running app and fails (never skips) when nothing answers. Start the stack
  with `JWT_SECRET` and `INTERNAL_TOKEN` exported, run `pnpm db:migrate`, then
  `E2E_BASE_URL=http://localhost:8080 pnpm test:e2e` (nginx serves the web app and proxies `/api`).
  Install the browser once with `pnpm exec playwright install chromium`.
