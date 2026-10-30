# Tasks: DEV-9 Authentication and shared contracts

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-9`. Test names start with the FRS ID.
Per the batch instruction, tests are limited to unit/Supertest tests of pure logic and routes with mocked models; full suites are deferred to DEV-19.

## 1. Shared

- [ ] 1.1 Add auth schemas (register, login, token response, user, me) and error-code helpers. Verify: `pnpm --filter @app/shared test`. **[FR-AUTH-001, FR-AUTH-002, FR-AUTH-007, NFR-SEC-003]**
- [ ] 1.2 Add project, member, task (incl. `ALLOWED_TRANSITIONS`, list query), comment, activity and pagination schemas. Verify: `pnpm --filter @app/shared test`. **[FR-PROJ-001, FR-TASK-001, FR-TASK-005, FR-FILT-001, FR-CMT-001, FR-ACT-001]**

## 2. Database

- [ ] 2.1 Define the 7 models and associations; export from `@app/database`. Verify: `pnpm --filter @app/database build`. **[NFR-SEC-004]**
- [ ] 2.2 Migrations users + refresh_tokens (reversible) and demo-users seeder. Verify: `pnpm db:up && pnpm db:migrate` then undo, if Docker is available; otherwise `pnpm --filter @app/database build`. **[FR-AUTH-001, FR-AUTH-003]**

## 3. Auth service

- [ ] 3.1 Config, pino logger with redaction, helmet, validate helper, internal-identity middleware. Verify: `pnpm --filter auth test`. **[NFR-SEC-003, NFR-SEC-005, NFR-SEC-006, NFR-OBS-001]**
- [ ] 3.2 Register endpoint (route → controller → service). Verify: `pnpm --filter auth test`. **[FR-AUTH-001, NFR-SEC-001]**
- [ ] 3.3 Login endpoint with dummy compare and cookie. Verify: `pnpm --filter auth test`. **[FR-AUTH-002, NFR-SEC-002]**
- [ ] 3.4 Refresh with rotation in a transaction and reuse detection; logout. Verify: `pnpm --filter auth test`. **[FR-AUTH-003, FR-AUTH-004]**
- [ ] 3.5 `GET /auth/me`. Verify: `pnpm --filter auth test`. **[FR-AUTH-007]**

## 4. Gateway and tracker identity

- [ ] 4.1 JWT verification, header forwarding/stripping, request id. Verify: `pnpm --filter api-gateway test`. **[FR-AUTH-005, NFR-OBS-001]**
- [ ] 4.2 Rate limits (login, register), CORS, helmet, tracker proxy routes. Verify: `pnpm --filter api-gateway test`. **[FR-AUTH-002, NFR-SEC-006]**
- [ ] 4.3 Tracker `requireInternalIdentity`, pino, helmet. Verify: `pnpm --filter tracker test`. **[FR-AUTH-005, NFR-SEC-006]**

## 5. Docs and config

- [ ] 5.1 Pin new deps in `docs/versions.md`; env variable names in compose/`.env.example`; SDS §7.1 note. Verify: `pnpm check:versions`. **[NFR-OPS-001, NFR-SEC-005]**

## 6. Quality gates

- [ ] 6.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.
