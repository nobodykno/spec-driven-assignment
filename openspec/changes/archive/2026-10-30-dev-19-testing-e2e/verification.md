# Verification: DEV-19 Testing — authorization, regression and end-to-end tests

- Ticket: DEV-19 (assignment ID DEV-1016)
- Ticket source: live MCP
- Approved by: Paramjit Jena (via chat), 2026-10-30 20:00 IST
- Branch: `feature/DEV-19-testing-e2e`
- Verified: 2026-10-30, after the review-fix commit `b5f3065`

## Result

**READY FOR PR**: every gate passes, no functional requirement lacks a test, and no critical or high finding is open. The `/cost` row for `docs/token-efficiency.md` was not provided and is recorded as such.

## Gate results

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` | pass |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 415 tests (shared 39, database 1, api-gateway 14, auth 22, web 41, tracker 128, scripts and hooks 170) |
| `E2E_BASE_URL=http://localhost:8080 pnpm test:e2e` | pass: 2 tests, against the Docker stack |
| `openspec validate dev-19-testing-e2e --strict` | valid; 10 of 10 tasks ticked |
| `pnpm coverage:requirements` | exit 0 (no `FR-*` without a test) |

## Traceability

| FRS ID | Spec scenario | Test (file : name) | Result |
| --- | --- | --- | --- |
| NFR-TST-001 | Every requirement has a test | `scripts/coverage-by-requirement.test.mjs` : `NFR-TST-001: lists tests per requirement and reports functional gaps` | pass |
| NFR-TST-001 | Missing test is reported | same file : `NFR-TST-001: lists tests per requirement and reports functional gaps` (`missingFunctional`) | pass |
| FR-PROJ-003 | Owner can do everything | `services/tracker/test/authz.test.ts` : `FR-PROJ-003: update project as owner gets the status FRS §2.2 gives` (and archive, add/remove member, delete any comment rows) | pass |
| FR-PROJ-005 | Member limited by role | same file : `FR-PROJ-005: add member as member gets ...` (403 and `FORBIDDEN` code) | pass |
| FR-TASK-001 | Member works with tasks and comments | same file : `FR-TASK-001: create task as member ...`, plus update, assign, archive and add-comment rows | pass |
| FR-PROJ-002 | Non-member sees nothing | same file : `FR-PROJ-002: a non-member gets the same 404 body as for a project that does not exist` and every non-member row (404, `NOT_FOUND`) | pass |
| FR-CMT-002 | Comment ownership | same file : `FR-CMT-002: edit someone else's comment as owner ...` (403) and `edit own comment` rows | pass |
| FR-PROJ-006 | Conflict codes | `services/tracker/test/regression.test.ts` : `FR-PROJ-006: removing the last Owner is 409 LAST_OWNER` | pass |
| FR-PROJ-005 | Conflict codes | same file : `FR-PROJ-005: adding an existing member is 409 ALREADY_MEMBER` | pass |
| FR-TASK-005 | Conflict codes | same file : `FR-TASK-005: TODO to DONE is 409 INVALID_STATUS_TRANSITION and changes nothing` | pass |
| FR-TASK-004 | Conflict codes | same file : `FR-TASK-004: assigning a non-member is 400 ASSIGNEE_NOT_MEMBER` | pass |
| FR-PROJ-004 | Conflict codes | same file : `FR-PROJ-004: writing to an archived project is 409 PROJECT_ARCHIVED` | pass |
| FR-TASK-006 | Conflict codes | same file : `FR-TASK-006: writing to an archived task is 409 TASK_ARCHIVED` | pass |
| NFR-REL-001 | Activity written with the change | same file : `NFR-REL-001: a failing activity write rolls the status change back` | pass |
| FR-ACT-001 | Activity recorded on success | same file : `FR-ACT-001: create, assign and DONE leave one entry each, listed newest first` | pass |
| NFR-TST-002 | Full journey | `e2e/journey.spec.ts` : `NFR-TST-002: register, project, member, task, assign, DONE, comment, activity` | pass |
| NFR-TST-002 | Journey fails loudly | same test run with `E2E_BASE_URL=http://localhost:9`: reported as failed, not skipped (run by hand during apply) | pass |
| NFR-TST-001 | Results saved | `docs/test-results.md` written from this run | pass |

## Requirements with no test

Functional requirements: none (`pnpm coverage:requirements` exits 0).

Non-functional requirements with no test named after them, listed in `docs/test-results.md`:
NFR-MNT-002, NFR-OBS-001, NFR-SEC-001..004, NFR-SEC-006, NFR-USA-001. NFR-PERF-001 and NFR-PERF-002
are covered by the DEV-12 performance check (Phase 3, step 7). These are outside this ticket's scope
(FR-* and the NFR-TST pair) and are passed to the independent review (DEV-20).

## Reviewer findings (`reviewer` subagent; read-only, it could not run tests)

Verdict from the reviewer: CHANGES REQUIRED (no critical or high findings). Gates and e2e were run
by this session instead.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `scripts/coverage-by-requirement.mjs:12` | Template-literal matrix titles were invisible to the report | fixed in `b5f3065`: titles of the form `${id}: ...` credit the file's `id:` rows; unit test added |
| low | `scripts/coverage-by-requirement.mjs:12` | `it.skip` and `it.todo` counted as coverage | fixed: excluded; unit test added |
| low | `packages/database/scripts/prepare-test-db.cjs` | Migration errors hidden; database name not strictly validated | fixed: stderr surfaced with `cause`; name must match `[a-z0-9_]+_test` |
| low | `e2e/journey.spec.ts:84` | No check of activity order or final DONE after reload | fixed: asserts DONE after reload, newest entry first, oldest last |
| low | `services/tracker/test/authz.test.ts` | 403/404 rows asserted status only | fixed: also asserts `FORBIDDEN` / `NOT_FOUND`. Database state after a denied write is not asserted: accepted, because the regression file checks no side effects for the 409 and rollback cases |
| found here | `scripts/coverage-by-requirement.mjs` | The report scanned its own test file and credited fixture strings | fixed: that file is excluded from the scan |

## Deviations from the spec or SDS

- Commit granularity: the commit for task 2.1 also contains the authorization matrix (2.2), and one docs commit covers tasks 4.1, 4.2 and 5.1.
- `packages/database/package.json` gained a script `prepare:test-db` (not a dependency) to create and migrate `tracker_test`.
- `pnpm test` now needs Postgres (`pnpm db:up`); this was the proposal's open question and was accepted with `approved`.
- Matrix test titles are built from a variable; the report credits them through the `id:` rows.
- The verification ran in the same Claude Code session as the apply, not a fresh one; independence comes from the `reviewer` subagent and from re-running every gate.
