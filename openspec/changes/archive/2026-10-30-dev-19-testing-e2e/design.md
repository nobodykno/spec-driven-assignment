# Design: DEV-19 Testing — authorization, regression and end-to-end tests

## Context

Follows SDS §11 and FRS §2.2. Tests only; no production behaviour changes. If a test exposes a defect, the fix is a separate bug ticket and PR (Phase 3 rule).

## Decisions

- **D1 Real database for the matrix.** `services/tracker/test/authz.test.ts` builds `createApp` with the real services and the real `@app/database` models against database `tracker_test` (SDS §11). A Vitest `globalSetup` creates `tracker_test` if missing, runs the migrations once (`sequelize-cli db:migrate` with `DATABASE_URL` pointing at it) and each test file truncates all tables in `beforeEach`. Identity headers (`x-internal-token`, `x-user-id`) are sent as the gateway would send them. It never touches the `tracker` development database.
- **D2 Matrix as data.** One table of `{ action, request, owner, member, nonMember }` drives `it.each`, mirroring FRS §2.2 row by row, so the matrix is readable and a new row is one line. Test names start with the FRS ID of the action (for example `FR-PROJ-003: member gets 403 on PATCH /projects/:id`).
- **D3 Regression file.** `services/tracker/test/regression.test.ts` covers the conflict codes and the NFR-REL-001 rollback with real constraints. The rollback case forces a failure inside the transaction (a stubbed activity writer that throws) and asserts both tables are unchanged.
- **D4 Coverage report.** `scripts/coverage-by-requirement.mjs` reads requirement IDs from `docs/FRS.md` headings (`#### FR-…`) and NFR table rows, scans `*.test.ts`, `*.test.tsx` and `e2e/*.spec.ts` for `it(`/`test(` titles starting with an ID, prints a Markdown table and exits 1 when an `FR-*` has no test. It is unit-tested with fixture strings and wired into `pnpm test` through the root `scripts/` tests. Gaps it finds are closed with small tests in the owning package (no new behaviour).
- **D5 Playwright journey.** `e2e/journey.spec.ts` runs against the Docker stack through nginx (`E2E_BASE_URL=http://localhost:8080`, `/api` proxied to the gateway), so the whole path web → gateway → services → Postgres is exercised. Two browser contexts (owner, member) with unique emails per run; role and label selectors only. Screenshots go to `docs/evidence/DEV-19/`. Preconditions (`pnpm db:up`, `pnpm db:migrate`, stack started with `JWT_SECRET` and `INTERNAL_TOKEN`) are documented in `docs/environment.md`. The existing no-webServer design (D14) is kept.
- **D6 Results.** `docs/test-results.md` is written from real command output (counts, date, coverage table), not by hand.

## Docs checked

Context7 at apply time: Playwright 1.64 (`test.step`, multiple `browser.newContext`, `expect(locator)` auto-wait) and Vitest 5 `globalSetup`.
