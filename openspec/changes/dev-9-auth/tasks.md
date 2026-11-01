# Tasks: DEV-9 Authentication and shared contracts

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-9`. Test names start with the FRS ID.
Per the batch instruction, tests are limited to unit/Supertest tests of pure logic and routes with mocked models; full suites are deferred to DEV-19.

## 1. Shared

- [x] 1.1 Add auth schemas (register, login, token response, user, me) and error-code helpers. Verify: `pnpm --filter @app/shared test`. **[FR-AUTH-001, FR-AUTH-002, FR-AUTH-007, NFR-SEC-003]**
- [x] 1.2 Add project, member, task (incl. `ALLOWED_TRANSITIONS`, list query), comment, activity and pagination schemas. Verify: `pnpm --filter @app/shared test`. **[FR-PROJ-001, FR-TASK-001, FR-TASK-005, FR-FILT-001, FR-CMT-001, FR-ACT-001]**

## 2. Database

- [x] 2.1 Define the 7 models and associations; export from `@app/database`. Verify: `pnpm --filter @app/database build`. **[NFR-SEC-004]**
- [x] 2.2 Migrations users + refresh_tokens (reversible) and demo-users seeder. Verify: `pnpm db:up && pnpm db:migrate` then undo, if Docker is available; otherwise `pnpm --filter @app/database build`. **[FR-AUTH-001, FR-AUTH-003]**

## 3. Auth service

- [x] 3.1 Config, pino logger with redaction, helmet, validate helper, internal-identity middleware. Verify: `pnpm --filter auth test`. **[NFR-SEC-003, NFR-SEC-005, NFR-SEC-006, NFR-OBS-001]**
- [x] 3.2 Register endpoint (route → controller → service). Verify: `pnpm --filter auth test`. **[FR-AUTH-001, NFR-SEC-001]**
- [x] 3.3 Login endpoint with dummy compare and cookie. Verify: `pnpm --filter auth test`. **[FR-AUTH-002, NFR-SEC-002]**
- [x] 3.4 Refresh with rotation in a transaction and reuse detection; logout. Verify: `pnpm --filter auth test`. **[FR-AUTH-003, FR-AUTH-004]**
- [x] 3.5 `GET /auth/me`. Verify: `pnpm --filter auth test`. **[FR-AUTH-007]**

## 4. Gateway and tracker identity

- [x] 4.1 JWT verification, header forwarding/stripping, request id. Verify: `pnpm --filter api-gateway test`. **[FR-AUTH-005, NFR-OBS-001]**
- [x] 4.2 Rate limits (login, register), CORS, helmet, tracker proxy routes. Verify: `pnpm --filter api-gateway test`. **[FR-AUTH-002, NFR-SEC-006]**
- [x] 4.3 Tracker `requireInternalIdentity`, pino, helmet. Verify: `pnpm --filter tracker test`. **[FR-AUTH-005, NFR-SEC-006]**

## 5. Docs and config

- [x] 5.1 Pin new deps in `docs/versions.md`; env variable names in compose/`.env.example`; SDS §7.1 note. Verify: `pnpm check:versions`. **[NFR-OPS-001, NFR-SEC-005]**

## 6. Quality gates

- [x] 6.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.

## Scenario to test map

Retroactive: tests were titled to the scenario names after merge (PR #6). The task is the original task that built the behaviour.

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| auth | Valid registration | FR-AUTH-001 | services/auth/test/auth-routes.test.ts | 3.2 |
| auth | Duplicate email | FR-AUTH-001 | services/auth/test/auth-routes.test.ts | 3.2 |
| auth | Invalid input | FR-AUTH-001 | services/auth/test/auth-routes.test.ts | 3.2 |
| auth | Valid login | FR-AUTH-002 | services/auth/test/auth-routes.test.ts | 3.3 |
| auth | Wrong email or password | FR-AUTH-002 | services/auth/src/auth-service.test.ts | 3.3 |
| auth | Rate limited | FR-AUTH-002 | services/api-gateway/src/gateway-auth.test.ts | 4.2 |
| auth | Rotation | FR-AUTH-003 | services/auth/src/auth-service.test.ts | 3.4 |
| auth | Invalid token | FR-AUTH-003 | services/auth/src/auth-service.test.ts | 3.4 |
| auth | Reuse detection | FR-AUTH-003 | services/auth/src/auth-service.test.ts | 3.4 |
| auth | Logout | FR-AUTH-004 | services/auth/test/auth-routes.test.ts | 3.4 |
| auth | Revoked token reused | FR-AUTH-004 | services/auth/src/auth-service.test.ts | 3.4 |
| auth | Missing, invalid or expired token | FR-AUTH-005 | services/api-gateway/src/gateway-auth.test.ts | 4.1 |
| auth | Valid token forwards identity | FR-AUTH-005 | services/api-gateway/src/gateway-auth.test.ts | 4.1 |
| auth | Profile | FR-AUTH-007 | services/auth/test/auth-routes.test.ts | 3.5 |
| auth | No identity | FR-AUTH-007 | services/auth/test/auth-routes.test.ts | 3.5 |
| auth | Redaction | NFR-SEC-005 | services/auth/src/logger.test.ts | 3.1 |
| auth | Contracts parse valid and reject invalid data | NFR-SEC-003 | packages/shared/src/schemas/contracts.test.ts | 1.1 |
