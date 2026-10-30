# Design: DEV-9 Authentication and shared contracts

## Context

Skeleton from DEV-1: gateway proxies only `/api/v1/auth`; auth and tracker expose `/health`. Follows SDS §2.2, §3.1, §5, §6, §7, §10.

## Decisions

- **D1 Contracts first.** `packages/shared/src/schemas/{auth,project,task,comment,activity}.ts` hold request/response Zod schemas, enums (`TaskStatus`, `TaskPriority`, `ProjectRole`, `ActivityAction`), the status transition table `ALLOWED_TRANSITIONS`, and `PaginatedSchema(item)`. Types are `z.infer`. Everything exported from `@app/shared`.
- **D2 All models now.** `packages/database/src/models/` defines User, RefreshToken, Project, ProjectMember, Task, Comment (paranoid), Activity with associations, so parallel worktrees never edit the same `models/index.ts`. Migrations stay per ticket.
- **D3 Passwords.** `bcryptjs` cost 12; login runs a dummy compare for unknown emails (SDS §7.1); same `INVALID_CREDENTIALS` message.
- **D4 Tokens.** Access JWT HS256 (`sub`, `role`, `iat`, `exp`, 15 min) signed with `JWT_SECRET`. Refresh = 32 random bytes base64url; DB stores SHA-256; cookie `refresh_token`, httpOnly, SameSite=Strict, Secure when `NODE_ENV=production`, path `/api/v1/auth`, 7 days. Rotation in one transaction (SDS §5.5); presenting a revoked token revokes the whole `family_id` and returns 401.
- **D5 Gateway.** Public: register, login, refresh, health. Everything else: verify Bearer JWT → 401 `UNAUTHORIZED`; add `X-Request-Id`, `X-User-Id`, `X-User-Role`, `X-Internal-Token`; strip any client-supplied copies. Proxies `/api/v1/auth` → auth, `/api/v1/{projects,tasks,comments}` → tracker. `express-rate-limit`: login 10 failed/15 min/IP (successes skipped), register 20/hour/IP, → 429 `RATE_LIMITED` in the standard error shape.
- **D6 Services trust only the gateway.** Auth `/auth/me` and `/auth/logout` and tracker routes use `requireInternalIdentity` middleware: valid `X-Internal-Token` (constant-time compare) and `X-User-Id`, else 401. Env: `JWT_SECRET`, `INTERNAL_TOKEN`, `TRACKER_SERVICE_URL`, `WEB_ORIGIN` (names added to `.env.example` and compose; values never committed).
- **D7 Logging.** pino with redaction of `authorization`, `cookie`, `password`, `token`, `refreshToken`; request log line with `requestId`, `userId`, method, path, status, duration (NFR-OBS-001).
- **D8 Errors.** Zod failures map to 400 `VALIDATION_ERROR` with `details[{path,message}]` via a shared `validate(schema)` helper in each service's middleware.
- **Not in scope:** OpenAPI generation (NFR-MNT-002) is left for a later ticket; not in DEV-9's requirement list.

## Docs checked

Context7 MCP is used at apply time for `jsonwebtoken`, `express-rate-limit`, `cookie-parser`, `pino` redaction; library, version and topic are recorded here when checked.
