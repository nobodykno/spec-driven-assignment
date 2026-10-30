# Tasks: DEV-19 Testing — authorization, regression and end-to-end tests

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-19`. Test names start with the FRS ID. Tests before implementation.

## 1. Scripts — coverage by requirement

- [x] 1.1 Failing unit test for the coverage script (found, missing, NFR rows). Verify: `pnpm exec vitest run scripts/`. **[NFR-TST-001]**
- [x] 1.2 `scripts/coverage-by-requirement.mjs` makes it pass; add `pnpm coverage:requirements`. Verify: `pnpm exec vitest run scripts/`. **[NFR-TST-001]**
- [x] 1.3 Run it and add small tests in the owning packages for every `FR-*` it reports as uncovered. Verify: `pnpm coverage:requirements` exits 0. **[NFR-TST-001]** No functional requirement was uncovered, so no tests were added; uncovered NFR rows are recorded in `docs/test-results.md`.

## 2. Tracker — real-database tests

- [x] 2.1 `globalSetup` and truncate helper for `tracker_test`. Verify: `pnpm --filter tracker test`. **[NFR-TST-001]**
- [x] 2.2 `test/authz.test.ts` matrix (projects, members, tasks, comments). Verify: `pnpm --filter tracker test`. **[FR-PROJ-003, FR-PROJ-005, FR-TASK-001, FR-CMT-002]**
- [x] 2.3 `test/regression.test.ts` conflict codes and NFR-REL-001 rollback. Verify: `pnpm --filter tracker test`. **[FR-PROJ-006, FR-TASK-005, NFR-REL-001, FR-ACT-001]**

## 3. End-to-end

- [x] 3.1 `e2e/journey.spec.ts` register → project → member → task → assign → DONE → comment → activity. Verify: `pnpm test:e2e` against the running stack. **[NFR-TST-002]**

## 4. Docs

- [ ] 4.1 `docs/environment.md`: test database and e2e preconditions. **[NFR-TST-001, NFR-TST-002]**
- [ ] 4.2 `docs/test-results.md` from real output (both commands plus the coverage table). **[NFR-TST-001]**

## 5. Quality gates

- [ ] 5.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass; `pnpm test:e2e` passes.
