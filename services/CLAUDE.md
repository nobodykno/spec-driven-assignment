# services/ — backend rules (auth, tracker, api-gateway)

Read with the root CLAUDE.md, docs/CODING_GUIDELINES.md and SDS §3.1, §5.5, §6, §7, §10, §11.
To add an endpoint, use the `express-endpoint` skill. For a schema change, use `sequelize-migration`.

## Layering (SDS §3.1)
- `routes/` wire URL + middleware only → `controllers/` map HTTP ↔ service → `services/` hold
  business rules → `@app/database` models. ESLint rejects `@app/database` in routes/controllers.
- `app.ts` exports `createApp(deps)`. `index.ts` only reads env and calls `listen`. Dependencies
  (database check, clock, …) are injected through `createApp`, so Supertest needs no server.
- The gateway (`api-gateway`) only verifies, rate-limits and proxies. Business logic lives in auth/tracker.

## Input, errors, auth
- Validate every body, query and param with a Zod schema from `@app/shared` (`zod-contract`).
- Throw `AppError(code, status, message, details?)` with an SDS §6.4 code. The central
  `errorHandler` writes `{ error: { code, message, details? } }`; never build that body by hand.
- Unknown errors become 500 `INTERNAL_ERROR` and are logged server-side, with no stack in the response.
- Protected routes: 401 without a valid identity. Non-members get **404**, the wrong role **403**,
  and membership is checked in the query (SDS §7.3).

## Data
- Multi-step writes and their activity entry run in one transaction (SDS §5.5).
- Never edit an applied migration and never call `sync()` outside tests (SDS §5.4).

## Tests
- `src/**/*.test.ts` with Vitest + Supertest against `createApp(...)`. Names start with the FRS ID.
- Cover success, validation (400), 401, 404/403 and every conflict code the FRS names, plus side effects.

## Logging
- No `console.log` in request code. Use the logger (pino, from DEV-1006). Until it exists, only
  `index.ts` startup messages and the error handler may use `console`.
