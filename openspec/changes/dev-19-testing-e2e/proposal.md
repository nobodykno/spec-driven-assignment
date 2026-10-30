Ticket: DEV-19
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-19 Testing — authorization, regression and end-to-end tests

> Jira `DEV-19` is "[DEV-1016] Testing — unit, integration, authorization, regression and end-to-end tests". Assignment ID **DEV-1016**. Change name `dev-19-testing-e2e`.

## Why

The DEV-9..16 build used mock-based route tests. Nothing yet proves the role matrix of FRS §2.2 against a real database, the conflict codes against real constraints, or the full user journey in a browser. NFR-TST-001 asks for at least one automated test per acceptance criterion; NFR-TST-002 asks for the Playwright journey.

## FRS requirements covered

NFR-TST-001, NFR-TST-002. The matrix and regression tests exercise FR-PROJ-001..006, FR-TASK-001..006, FR-CMT-001..004, FR-ACT-001..002 and NFR-REL-001 (test additions only, no behaviour change).

## SDS sections followed / changed

- **Followed:** §11 (authorization matrix in `services/tracker/test/authz.test.ts`, real `tracker_test` database, truncated between tests; Playwright journey in `e2e/`), §6.4 error codes, FRS §2.2.
- **Changed:** none.

## Affected packages

`services/tracker` (new `test/` files and a test-database setup), `scripts/` (coverage-by-requirement report), `e2e/` (journey), `docs/` (`test-results.md`, `environment.md`).

## New dependencies

None. `@playwright/test` 1.64.1 is already pinned; the Chromium browser binary is downloaded with `pnpm exec playwright install chromium` (not a package change).

## Database changes

None. A separate database `tracker_test` is created in the existing Postgres container and migrated with the existing migrations.

## Rollback plan

Revert the merge commit. Only tests, scripts and docs change; drop `tracker_test` with `DROP DATABASE`.

## Ticket dependencies

- DEV-9..DEV-16 (Jira DEV-1006..1013): implemented and merged (PRs #6 to #13). Their Jira status is still **To Do** at proposal time because the plan closes tickets after the independent review (Phase 3, step 9).

## Open questions

1. `authz.test.ts` and the regression tests need a running Postgres, so `pnpm test` (and the pre-push hook) will require `pnpm db:up`. Accept this, or put them behind a separate `pnpm test:integration` script? **Proposed: accept; Postgres is already needed for `pnpm dev`.**
