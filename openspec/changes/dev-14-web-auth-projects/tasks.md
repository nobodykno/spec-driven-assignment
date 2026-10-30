# Tasks: DEV-14 Web auth and projects

Rules: one commit per task `type(area): <n.m> <summary>` with footer `Refs: DEV-14`. Test names start with the FRS ID. Tests are minimal in this batch.

## 1. Web foundation

- [ ] 1.1 Add Tailwind v4, shadcn base components, `cn`, pinned deps in `docs/versions.md`. Verify: `pnpm --filter web build && pnpm check:versions`. **[FR-UI-010, NFR-USA-001]**
- [ ] 1.2 Auth store, API client with single-flight refresh and `ApiError`. Verify: `pnpm --filter web test`. **[FR-UI-002]**
- [ ] 1.3 QueryClient provider, router, `ProtectedRoute`, `QueryState` component. Verify: `pnpm --filter web test`. **[FR-AUTH-005, FR-UI-010]**

## 2. Auth pages

- [ ] 2.1 Auth API hooks and Login/Register pages with `zodResolver` and server error mapping. Verify: `pnpm --filter web test`. **[FR-UI-001]**
- [ ] 2.2 Logout and session bootstrap. Verify: `pnpm --filter web test`. **[FR-UI-001, FR-UI-002]**

## 3. Projects

- [ ] 3.1 Project API hooks. Verify: `pnpm --filter web typecheck`. **[FR-UI-003]**
- [ ] 3.2 Projects page: list, create, edit, archive. Verify: `pnpm --filter web test`. **[FR-UI-003, FR-UI-010]**
- [ ] 3.3 Project settings page with members add/remove, Owner-only. Verify: `pnpm --filter web test`. **[FR-UI-004]**

## 4. Quality gates

- [ ] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass. [PARALLEL] worktree with DEV-15.
