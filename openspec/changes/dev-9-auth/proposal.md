Ticket: DEV-9
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 18:10 IST

# Proposal: DEV-9 Authentication and shared API contracts

> Jira `DEV-9` is "[DEV-1006] Authentication — registration, login, logout and token handling". Assignment ID **DEV-1006**.

## Why

Every other feature needs identity. DEV-9 delivers accounts and JWT auth in `services/auth`, token verification and identity
forwarding at the gateway, and (per the batch instruction) the **shared Zod contracts for auth, projects, tasks, comments and
activity** plus the Sequelize models, so DEV-10..DEV-16 can be built in parallel against fixed contracts.

## FRS requirements covered

FR-AUTH-001, 002, 003, 004, 005, 007; NFR-SEC-001, 002, 003, 005, 006; NFR-OBS-001. (FR-AUTH-006 is DEV-10.)
Contracts only (no behaviour): FR-PROJ-*, FR-TASK-*, FR-FILT-*, FR-CMT-*, FR-ACT-*.

## SDS sections followed / changed

- **Followed:** §2.2 request flow, §3.1 layering, §5.2 users/refresh_tokens, §6 API and error codes, §7.1–7.4, §10.
- **Changed:** §7.1/§4 name `bcrypt`; implemented with `bcryptjs` (same algorithm, cost 12). SDS §7.1 gets one sentence in this change.

## Affected packages

`packages/shared` (schemas for all domains), `packages/database` (all 7 models + users/refresh_tokens migrations + user seeder),
`services/auth` (full), `services/api-gateway` (JWT verify, identity headers, rate limit, tracker proxy), `services/tracker`
(internal-identity middleware only), `docs/versions.md`, `docs/SDS.md`, `docker-compose.yml` and `.env.example` variable names.

## New dependencies (exact versions, checked with `pnpm view` on 2026-10-30)

| Package | Version | Used in | Reason |
| --- | --- | --- | --- |
| bcryptjs | 3.0.3 | auth, database (seeder) | bcrypt hashing, pure JS: no native build under pnpm 11 / Alpine |
| jsonwebtoken | 9.0.3 | auth, api-gateway | HS256 access tokens |
| @types/jsonwebtoken | 9.0.10 | auth, api-gateway | types |
| cookie-parser | 1.4.7 | auth | read the refresh cookie |
| @types/cookie-parser | 1.4.10 | auth | types |
| helmet | 8.3.0 | auth, tracker, api-gateway | security headers (NFR-SEC-006) |
| cors | 2.8.6 | api-gateway | CORS limited to web origin |
| @types/cors | 2.8.19 | api-gateway | types |
| express-rate-limit | 8.7.2 | api-gateway | login/register limits (FR-AUTH-002) |
| pino | 10.4.0 | auth, tracker, api-gateway | JSON logs with redaction (SDS §7.4) |

## Database changes

- Migration `…-create-users` (users, CITEXT extension, role enum) and `…-create-refresh-tokens` (+ indexes on user_id, family_id).
- Seeder `…-demo-users` (synthetic users). Models for all 7 tables defined now; the other tables' migrations ship with DEV-10/11/13.

## Rollback plan

Revert the branch's merge commit; `pnpm db:migrate:undo` twice removes both tables; no other data is touched.

## Ticket dependencies

- DEV-1 — **Done** (checked live 2026-10-30 via MCP).

## Deliberate deviations (stated by the user for this batch)

- Tests: only unit/Supertest tests with mocked or in-memory-free logic that the gates need are added now; full test suites, E2E and bug-fixing are deferred (DEV-19). Test names still start with the FRS ID.
- Independent review and archive happen after merge. DEV-9 is normally an Opus ticket (token policy); this batch runs on Sonnet 5.5 unless the user switches `/model`.

## Open questions

None blocking. Assumed A3 (15 min / 7 days) as in the FRS.
