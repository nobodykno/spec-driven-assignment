# apps/web — frontend rules

Read with the root CLAUDE.md, docs/CODING_GUIDELINES.md and SDS §3, §9.

## Structure (SDS §3)
- `src/features/<area>/` (auth, projects, tasks, comments) holds components, hooks and api calls;
  `src/components/ui/` holds shadcn components; `src/lib/` holds the api client, query client and
  auth store; `src/routes/` holds route definitions and the protected-route wrapper.
- Files and folders are kebab-case (`task-list.tsx`) with **named exports** (`export function TaskList`).
  Exported components have explicit return types (`JSX.Element`).

## Data
- Call the API only through the gateway: relative `/api/...` (the Vite dev proxy forwards to :4000).
  Never call auth or tracker ports directly.
- Parse every response with the Zod schema from `@app/shared`. Never define a local copy of an API type.
- Server state through TanStack Query (from DEV-1011): one hook per endpoint in
  `features/<feature>/api` (e.g. `useTasksQuery(projectId, filters)`), and no `fetch` inside
  components (SDS §9.2). The DEV-1 `app.tsx` health check is the one exception until DEV-1011.
  Use async/await; no `.then` chains.
- Task-list filters live in URL search params. Forms use `react-hook-form` + `zodResolver` with
  the `@app/shared` schemas.
- The access token is kept in memory only, never in localStorage (SDS §7.2, §9.2).

## UI
- Every data view has loading, empty and error states.
- Hide Owner-only controls for Members, but rely on the API for enforcement (403/404).
- Use `role`/label queries that RTL can find (e.g. `role="status"` for live status text).

## Tests
- `src/**/*.test.tsx` with Vitest + React Testing Library (jsdom). Names start with the FRS ID.
- Stub `fetch` (or the api client) per test; no real network.
- Browser checks: Playwright in `e2e/` against the running app (`pnpm test:e2e`).
