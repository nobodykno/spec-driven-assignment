# Test results

Last full run: 2026-10-30 (IST), branch `feature/DEV-19-testing-e2e`, Docker stack up with the
current images. Numbers below are copied from the command output.

| Command | Result |
| --- | --- |
| `pnpm build` | passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm test` | passed: 415 tests (shared 39, database 1, api-gateway 14, auth 22, web 41, tracker 128, root scripts and hooks 170) |
| `E2E_BASE_URL=http://localhost:8080 pnpm test:e2e` | passed: 2 tests (FR-SYS-002 API indicator, NFR-TST-002 journey) |

## What DEV-19 added

- `services/tracker/test/authz.test.ts`: FRS §2.2 matrix, 19 actions × 3 roles, plus the identical-404 and missing-token checks, against the real `tracker_test` database (59 tests).
- `services/tracker/test/regression.test.ts`: conflict codes and the NFR-REL-001 rollback against real constraints (9 tests).
- `e2e/journey.spec.ts`: register → project → member → task → assign → DONE → comment → activity through nginx, gateway, services and PostgreSQL. Screenshot: `docs/evidence/DEV-19/journey-task-activity.png`.
- `scripts/coverage-by-requirement.mjs` (`pnpm coverage:requirements`): the table below.

## Smoke test of the Docker stack

Run with curl through the gateway on port 4000 after migrating the development database: register,
duplicate email 409, login, wrong password 401, no token 401, project, member, outsider 404, member
rename 403, task, assign, illegal transition 409, TODO → DONE through the allowed steps, comment,
activity and filter all returned the expected status.

## Coverage by requirement (NFR-TST-001)

Every functional requirement (`FR-*`) has at least one test whose name starts with its ID: the script
exits 0. Data-driven titles of the form `${id}: ...` (the authorization matrix) are credited to every `id:` row of their file.

| Requirement | Tests | Files |
| --- | --- | --- |
| FR-ACT-001 | 3 | services/tracker/src/services/activity-service.test.ts, services/tracker/test/comments-routes.test.ts, services/tracker/test/regression.test.ts |
| FR-ACT-002 | 2 | services/tracker/test/authz.test.ts, services/tracker/test/comments-routes.test.ts |
| FR-AUTH-001 | 5 | packages/shared/src/schemas/contracts.test.ts, services/auth/test/auth-routes.test.ts |
| FR-AUTH-002 | 5 | packages/shared/src/schemas/contracts.test.ts, services/api-gateway/src/gateway-auth.test.ts, services/auth/src/auth-service.test.ts, services/auth/test/auth-routes.test.ts |
| FR-AUTH-003 | 5 | services/auth/src/auth-service.test.ts, services/auth/test/auth-routes.test.ts |
| FR-AUTH-004 | 3 | services/auth/src/auth-service.test.ts, services/auth/test/auth-routes.test.ts |
| FR-AUTH-005 | 10 | apps/web/src/routes/routes.test.tsx, services/api-gateway/src/gateway-auth.test.ts, services/tracker/src/app.test.ts, services/tracker/test/authz.test.ts |
| FR-AUTH-006 | 3 | services/tracker/src/project-access.test.ts |
| FR-AUTH-007 | 2 | services/auth/test/auth-routes.test.ts |
| FR-CMT-001 | 3 | packages/shared/src/schemas/contracts.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/comments-routes.test.ts |
| FR-CMT-002 | 4 | services/tracker/src/services/comment-service.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/comments-routes.test.ts |
| FR-CMT-003 | 6 | services/tracker/src/services/comment-service.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/comments-routes.test.ts |
| FR-CMT-004 | 2 | services/tracker/test/authz.test.ts, services/tracker/test/comments-routes.test.ts |
| FR-FILT-001 | 8 | packages/shared/src/schemas/contracts.test.ts, services/tracker/src/services/task-query.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-FILT-002 | 3 | services/tracker/src/services/task-query.test.ts |
| FR-FILT-003 | 3 | packages/shared/src/schemas/contracts.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-PROJ-001 | 3 | packages/shared/src/schemas/contracts.test.ts, services/tracker/test/projects-routes.test.ts |
| FR-PROJ-002 | 4 | services/tracker/test/authz.test.ts, services/tracker/test/projects-routes.test.ts |
| FR-PROJ-003 | 3 | services/tracker/src/project-access.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/projects-routes.test.ts |
| FR-PROJ-004 | 3 | services/tracker/src/project-access.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/regression.test.ts |
| FR-PROJ-005 | 4 | services/tracker/test/authz.test.ts, services/tracker/test/projects-routes.test.ts, services/tracker/test/regression.test.ts |
| FR-PROJ-006 | 3 | services/tracker/test/authz.test.ts, services/tracker/test/projects-routes.test.ts, services/tracker/test/regression.test.ts |
| FR-SYS-001 | 19 | packages/database/src/health.test.ts, packages/shared/src/schemas/common.test.ts, services/api-gateway/src/app.test.ts, services/api-gateway/src/proxy.test.ts, services/auth/src/app.test.ts, services/tracker/src/app.test.ts |
| FR-SYS-002 | 8 | apps/web/src/app.test.tsx, e2e/web-api-status.spec.ts, services/api-gateway/src/app.test.ts |
| FR-TASK-001 | 7 | packages/shared/src/schemas/contracts.test.ts, services/tracker/src/services/task-rules.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-TASK-002 | 3 | services/tracker/test/authz.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-TASK-003 | 2 | services/tracker/test/authz.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-TASK-004 | 4 | services/tracker/src/services/task-service.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/regression.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-TASK-005 | 9 | packages/shared/src/schemas/contracts.test.ts, services/tracker/src/services/task-rules.test.ts, services/tracker/src/services/task-service.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/regression.test.ts, services/tracker/test/tasks-routes.test.ts |
| FR-TASK-006 | 4 | services/tracker/src/services/task-service.test.ts, services/tracker/test/authz.test.ts, services/tracker/test/regression.test.ts, services/tracker/test/tasks-routes.test.ts |
| NFR-MNT-001 | 97 | .claude/hooks/agent-scope-guard.test.mjs, .claude/hooks/post-edit-format.test.mjs, .claude/hooks/pre-tool-guard.test.mjs, packages/shared/src/schemas/common.test.ts, scripts/check-agents.test.mjs, scripts/check-claude-settings.test.mjs, scripts/check-file-names.test.mjs, scripts/check-graph-docs.test.mjs, scripts/check-workflow.test.mjs, scripts/commitlint.test.mjs, scripts/lint-rules.test.mjs, services/auth/src/app.test.ts, services/tracker/src/app.test.ts |
| NFR-MNT-002 | 0 | none |
| NFR-OBS-001 | 0 | none |
| NFR-OPS-001 | 16 | scripts/check-graph-docs.test.mjs, scripts/check-versions.test.mjs |
| NFR-PERF-001 | 0 | none |
| NFR-PERF-002 | 0 | none |
| NFR-REL-001 | 2 | services/tracker/src/services/activity-service.test.ts, services/tracker/test/regression.test.ts |
| NFR-SEC-001 | 0 | none |
| NFR-SEC-002 | 0 | none |
| NFR-SEC-003 | 0 | none |
| NFR-SEC-004 | 0 | none |
| NFR-SEC-005 | 43 | .claude/hooks/pre-tool-guard.test.mjs, scripts/check-claude-settings.test.mjs, scripts/check-staged-secrets.test.mjs |
| NFR-SEC-006 | 0 | none |
| NFR-TST-001 | 9 | .claude/hooks/agent-scope-guard.test.mjs |
| NFR-TST-002 | 1 | e2e/journey.spec.ts |
| NFR-USA-001 | 0 | none |

### Non-functional requirements with no test named after them

| Requirement | Status |
| --- | --- |
| NFR-PERF-001, NFR-PERF-002 | Covered by the 10,000-task performance check (DEV-12), recorded separately |
| NFR-SEC-001..004, NFR-SEC-006 | Behaviour is exercised by FR-AUTH tests, but no test carries the NFR ID; flagged for the independent review (DEV-20) |
| NFR-MNT-002, NFR-OBS-001, NFR-USA-001 | No automated test named after them; flagged for the independent review (DEV-20) |

## Performance

Command: `pnpm --filter tracker perf` (not part of `pnpm test`; database `tracker_perf_test`). Real
`createApp` through Supertest, a project with 10,000 tasks, 20 warm-up and 200 measured requests
cycling through five query shapes (default, status filter, assignee filter, sort by due date,
page 100). Numbers are copied from the run output on 2026-10-30.

| Requirement | Metric | Measured | Limit |
| --- | --- | --- | --- |
| NFR-PERF-001 | p50 | 16.4 ms | none |
| NFR-PERF-001 | p95 | 69.4 ms | below 300 ms: passed |
| NFR-PERF-001 | max | 230.1 ms | none |
| NFR-PERF-002 | four task indexes in the migrated database | present | passed |

Four runs on 2026-10-30 (implementer, two verification runs, review fix) gave p95 of 69.4, 46.3,
36.5 and 42.6 ms and p50 of 12.3 to 16.4 ms. The single slowest request varied from 59 ms to 346 ms
(one outlier in one run), which is why the limit applies to the 95th percentile and not the maximum.
