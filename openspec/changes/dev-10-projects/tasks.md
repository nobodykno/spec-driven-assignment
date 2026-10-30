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
