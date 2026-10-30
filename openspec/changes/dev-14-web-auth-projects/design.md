# Design: DEV-14 Web auth and projects

## Context

Follows SDS §3, §7.2, §9. Files live under `apps/web/src/{components/ui,lib,features/auth,features/projects,routes}`. Vite proxies `/api` to the gateway (:4000) in dev; nginx does so in Docker (already configured for the status indicator — checked at apply).

## Decisions

- **D1 Tailwind v4 + shadcn/ui.** `@tailwindcss/vite` plugin and `src/index.css` with `@import "tailwindcss"`. shadcn components are copied sources in `components/ui` (button, input, label, card, badge); `lib/utils.ts` has `cn`. Native `<select>`/`<dialog>`-free forms keep the dependency set small.
- **D2 API client** (`lib/api-client.ts`): `apiFetch<T>(path, { method, body, schema })`; adds `Authorization` from the in-memory token store; on 401 calls `POST /api/v1/auth/refresh` once (single in-flight refresh promise), retries, and if refresh fails clears the session and navigates to `/login`. Errors become `ApiError { status, code, message, details }` from the `{ error }` envelope. No `fetch` inside components.
- **D3 Auth store** (`lib/auth-store.ts`): token and user in module memory with a subscribe API (`useSyncExternalStore`); never `localStorage`. On app load a bootstrap `refresh` restores the session.
- **D4 Routing** (`routes/`): `/login`, `/register` guest-only; `ProtectedRoute` redirects to `/login` (FR-AUTH-005); `/projects`, `/projects/:projectId/settings` (Owner only: Members redirected to the project page), `/` redirects to `/projects`. DEV-15/16 add `/projects/:projectId` and `/tasks/:taskId` routes in their own route modules to keep the router file mergeable.
- **D5 Forms** use `react-hook-form` + `zodResolver(RegisterSchema|LoginSchema|CreateProjectSchema…)` from `@app/shared`; server `details` map onto fields (inline errors, FR-UI-001).
- **D6 Hooks** per endpoint in `features/*/api` (`useLoginMutation`, `useProjectsQuery`, `useCreateProjectMutation`, `useUpdateProjectMutation`, `useArchiveProjectMutation`, `useAddMemberMutation`, `useRemoveMemberMutation`).
- **D7 Views** all have loading, empty and error states through a shared `QueryState` component (FR-UI-010). Owner-only controls (edit, archive, add/remove member) render only when the current user's role in the project is OWNER; the API still enforces it.
- **D8 Accessibility** (NFR-USA-001): labels bound to inputs, buttons for actions, focus-visible styles.

## Docs checked

Context7 at apply time: React Router (data/declarative mode for the pinned version), TanStack Query v5, react-hook-form + resolvers v6 with Zod 4, Tailwind v4 Vite plugin.
