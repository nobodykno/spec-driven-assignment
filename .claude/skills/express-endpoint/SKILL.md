---
name: express-endpoint
description: Add or change an HTTP endpoint in services/auth or services/tracker using the route → controller → service layering, Zod validation from @app/shared, AppError responses and a test-first Supertest test. Use when the user asks for a new endpoint, route, handler or API operation in a backend service.
---

# Express endpoint (Express 5, SDS §3.1)

Layers: **route → controller → service → `@app/database` models**. Each layer has one job,
and the files are kebab-case with named exports.

| Layer | File | Does | Never |
| --- | --- | --- | --- |
| Route | `src/routes/<resource>.ts` | URL, method, middleware (validate, authorize), wiring | logic, DB access |
| Controller | `src/controllers/<resource>.ts` | parse/validate request → call service → map result to status + body | business rules, models |
| Service | `src/services/<resource>-service.ts` | business rules, membership/role checks, transactions, activity | `req`/`res` |
| Model | `@app/database` | data access | — (only services import it) |

## Procedure

1. **Contract first:** run the `zod-contract` skill for the request body/query and the response.
   The endpoint, path, status codes and error codes come from SDS §6.2 / §6.4 and the FRS
   acceptance criteria.
2. **Test first:** in `services/<svc>/src/<resource>.test.ts`, use Supertest against
   `createApp(deps)` (never `index.ts`). Name every test with the FRS ID. Cover:
   - success: status and body parsed with the response schema
   - validation failure: 400 `VALIDATION_ERROR` with `details`
   - for protected routes: 401, non-member 404 and wrong role 403 (CLAUDE.md, SDS §7.3)
   - each conflict code the FRS names (409 …)
   - side effects (DB rows, activity entries) for writes

   Inject dependencies through `createApp`, as `checkDatabase` is injected today, so the tests
   need no running server. Run `pnpm --filter <svc> test` and watch them fail.
3. **Service:** a function or class in `src/services/<resource>-service.ts`.
   - Throw `AppError(code, status, message, details?)` from `@app/shared` for every expected
     failure.
   - Run multi-step writes inside one Sequelize transaction (SDS §5.5).
   - Give exported functions explicit return types.
   - Keep functions ≤ 30 lines and nesting ≤ 3; use early returns.
4. **Controller:** an `async` handler.
   - Validate with `<Schema>.safeParse(req.body | req.query | req.params)`. On failure, throw
     `new AppError('VALIDATION_ERROR', 400, 'Invalid request', issues)`. Or use a shared
     `validate(schema)` middleware in `src/middleware/validate.ts` once a second endpoint needs it.
   - Call the service and send `res.status(...).json(body)`.
   - Express 5 forwards rejected promises to `errorHandler`, so do not add `try/catch` just to
     call `next(err)`.
5. **Route:** `export function <resource>Router(deps): Router` registers the paths. Mount it in
   `createApp` **before** `notFoundHandler` and `errorHandler`. Service routes are the paths the
   gateway forwards to (see `services/api-gateway/src/app.ts`).
6. **Verify:**
   - `pnpm --filter <svc> test && pnpm --filter <svc> typecheck`
   - `pnpm lint` (naming, return types, quotes, complexity)

## Checklist

- [ ] Request and response shapes come from `@app/shared`; there is no local `interface` for the same body
- [ ] Tests were written first, named `<FRS-ID>: …`, and cover success, validation, auth/membership and conflicts
- [ ] The route file only wires; the controller has no business rules and **no model import**; the service has no `req`/`res`
- [ ] Every error is an `AppError` with an SDS §6.4 code, and no handler builds its own `{ error: … }` body
- [ ] Non-members get 404 and the wrong role gets 403; membership is checked in the query, not after loading
- [ ] Multi-step writes and their activity entry are in one transaction
- [ ] No `any`, no `console.log` (use the logger once it exists), no swallowed errors
- [ ] Kebab-case file names, named exports, functions ≤ 30 lines, complexity ≤ 10

## Example in this repo

`services/tracker/src/routes/health.ts` → `controllers/health.ts` (dependency injected through
`createApp`), `middleware/error-handler.ts`, and tests in `src/app.test.ts`.
