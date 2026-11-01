# Tasks: DEV-14 Web auth and projects

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-14`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Web foundation

- [x] 1.1 Add Tailwind v4, shadcn base components, `cn`, pinned deps in `docs/versions.md`. Verify: `pnpm --filter web build && pnpm check:versions`. **[FR-UI-010, NFR-USA-001]**
- [x] 1.2 Auth store, API client with single-flight refresh and `ApiError`. Verify: `pnpm --filter web test`. **[FR-UI-002]**
- [x] 1.3 QueryClient provider, router, `ProtectedRoute`, `QueryState` component. Verify: `pnpm --filter web test`. **[FR-AUTH-005, FR-UI-010]**

## 2. Auth pages

- [x] 2.1 Auth API hooks and Login/Register pages with `zodResolver` and server error mapping. Verify: `pnpm --filter web test`. **[FR-UI-001]**
- [x] 2.2 Logout and session bootstrap. Verify: `pnpm --filter web test`. **[FR-UI-001, FR-UI-002]**

## 3. Projects

- [x] 3.1 Project API hooks. Verify: `pnpm --filter web typecheck`. **[FR-UI-003]**
- [x] 3.2 Projects page: list, create, edit, archive. Verify: `pnpm --filter web test`. **[FR-UI-003, FR-UI-010]**
- [x] 3.3 Project settings page with members add/remove, Owner-only. Verify: `pnpm --filter web test`. **[FR-UI-004]**

## 4. Quality gates

- [x] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-15.

## Scenario to test map

Retroactive: tests titled in commit 12.1 (change merged in PR #11 before the opsx workflow). Test titles are `<FRS ID>: <scenario name>`.

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| web-auth-projects | Successful login | FR-UI-001 | apps/web/src/features/auth/pages/login-page.test.tsx | 2.1 |
| web-auth-projects | Inline validation errors | FR-UI-001 | apps/web/src/features/auth/pages/login-page.test.tsx | 2.1 |
| web-auth-projects | Logout | FR-UI-001 | apps/web/src/features/auth/pages/login-page.test.tsx | 2.2 |
| web-auth-projects | Automatic refresh | FR-UI-002 | apps/web/src/lib/api-client.test.tsx | 1.2 |
| web-auth-projects | Refresh fails | FR-UI-002 | apps/web/src/routes/routes.test.tsx | 1.2 |
| web-auth-projects | Protected page as guest | FR-AUTH-005 | apps/web/src/routes/routes.test.tsx | 1.3 |
| web-auth-projects | List and create | FR-UI-003 | apps/web/src/features/projects/pages/projects-page.test.tsx | 3.2 |
| web-auth-projects | Edit and archive | FR-UI-003 | apps/web/src/features/projects/pages/projects-page.test.tsx | 3.2 |
| web-auth-projects | Owner manages members | FR-UI-004 | apps/web/src/features/projects/pages/project-settings-page.test.tsx | 3.3 |
| web-auth-projects | Member sees no owner controls | FR-UI-004 | apps/web/src/features/projects/pages/projects-page.test.tsx | 3.3 |
| web-auth-projects | States | FR-UI-010 | apps/web/src/features/projects/pages/projects-page.test.tsx | 3.2 |
