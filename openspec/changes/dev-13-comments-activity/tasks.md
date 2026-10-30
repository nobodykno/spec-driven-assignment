# Tasks: DEV-13 Comments and activity

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-13`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Database

- [ ] 1.1 Migration create comments and activities with indexes (reversible). Verify: `pnpm --filter @app/database build`. **[FR-CMT-004, FR-ACT-002]**

## 2. Tracker: activity

- [ ] 2.1 `ActivityService.record` (transactional) replacing the no-op hook; unit test of metadata shapes. Verify: `pnpm --filter tracker test`. **[FR-ACT-001, NFR-REL-001]**
- [ ] 2.2 `GET /tasks/:taskId/activity` (no write routes). Verify: `pnpm --filter tracker test`. **[FR-ACT-002]**

## 3. Tracker: comments

- [ ] 3.1 Add and list comments. Verify: `pnpm --filter tracker test`. **[FR-CMT-001, FR-CMT-004]**
- [ ] 3.2 Edit comment (author only) and delete (author or Owner). Verify: `pnpm --filter tracker test`. **[FR-CMT-002, FR-CMT-003]**
- [ ] 3.3 Mount routers in `app.ts`. Verify: `pnpm --filter tracker build`. **[FR-CMT-004]**

## 4. Quality gates

- [ ] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-12.
