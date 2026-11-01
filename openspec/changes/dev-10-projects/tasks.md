# Tasks: DEV-10 Projects, membership and access control

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-10`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Database

- [x] 1.1 Migration create projects and project_members (reversible, index on user_id). Verify: `pnpm --filter @app/database build`. **[FR-PROJ-001, FR-PROJ-002]**

## 2. Tracker

- [x] 2.1 `requireProjectRole` and `assertProjectActive` with tests for 404/403/409. Verify: `pnpm --filter tracker test`. **[FR-AUTH-006, FR-PROJ-003]**
- [x] 2.2 Create, list and view project endpoints. Verify: `pnpm --filter tracker test`. **[FR-PROJ-001, FR-PROJ-002]**
- [x] 2.3 Update and archive endpoints (Owner only). Verify: `pnpm --filter tracker test`. **[FR-PROJ-003, FR-PROJ-004]**
- [x] 2.4 Add member and remove member (LAST_OWNER, unassign + activity in one transaction). Verify: `pnpm --filter tracker test`. **[FR-PROJ-005, FR-PROJ-006]**
- [x] 2.5 Mount router in `app.ts`. Verify: `pnpm --filter tracker build`. **[FR-PROJ-002]**

## 3. Quality gates

- [x] 3.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-11.

## Scenario to test map

Retroactive: tests were titled to the scenario names after merge (PR #7). The task is the original task that built the behaviour.

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| projects | Valid project | FR-PROJ-001 | services/tracker/test/projects-scenarios.test.ts | 2.2 |
| projects | Invalid name | FR-PROJ-001 | services/tracker/test/projects-routes.test.ts | 2.2 |
| projects | List own projects | FR-PROJ-002 | services/tracker/test/projects-scenarios.test.ts | 2.2 |
| projects | Member views project | FR-PROJ-002 | services/tracker/test/projects-scenarios.test.ts | 2.2 |
| projects | Non-member views project | FR-PROJ-002 | services/tracker/test/projects-routes.test.ts | 2.2 |
| projects | Owner updates | FR-PROJ-003 | services/tracker/test/projects-scenarios.test.ts | 2.3 |
| projects | Member updates | FR-AUTH-006 | services/tracker/test/projects-routes.test.ts | 2.1 |
| projects | Non-member updates | FR-AUTH-006 | services/tracker/test/projects-scenarios.test.ts | 2.1 |
| projects | Archived project | FR-PROJ-003 | services/tracker/test/projects-scenarios.test.ts | 2.3 |
| projects | Owner archives | FR-PROJ-004 | services/tracker/test/projects-scenarios.test.ts | 2.3 |
| projects | Member archives | FR-PROJ-004 | services/tracker/test/projects-scenarios.test.ts | 2.3 |
| projects | Add user | FR-PROJ-005 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Unknown email | FR-PROJ-005 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Already member | FR-PROJ-005 | services/tracker/test/projects-routes.test.ts | 2.4 |
| projects | Member adds member | FR-AUTH-006 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Remove member | FR-PROJ-006 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Last owner | FR-PROJ-006 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Assigned tasks unassigned | FR-PROJ-006 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
| projects | Member removes member | FR-AUTH-006 | services/tracker/test/projects-scenarios.test.ts | 2.4 |
