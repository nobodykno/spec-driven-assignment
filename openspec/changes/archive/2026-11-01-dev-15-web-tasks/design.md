# Design: DEV-15 Web tasks

## Context

Follows SDS §9. Feature code in `apps/web/src/features/tasks/{api,components,pages}`; route module `routes/task-routes.tsx` exporting route objects that the router in `routes/index.tsx` (DEV-14) spreads in.

## Decisions

- **D1 Filters live in the URL.** `useTaskFilters()` reads/writes `useSearchParams`: `status`, `priority`, `assigneeId`, `dueFrom`, `dueTo`, `sort`, `order`, `page`, `pageSize`, `includeArchived`. Values are parsed with `TaskListQuerySchema` from `@app/shared`; invalid values fall back to defaults. Changing a filter resets `page` to 1. Reload keeps state.
- **D2 Hooks.** `useTasksQuery(projectId, filters)` (key includes filters, `placeholderData: keepPreviousData`), `useTaskQuery(taskId)`.
- **D3 Project page** `/projects/:projectId`: filter bar (native selects/inputs, labelled), sortable headers, table/list of tasks, pagination controls with page and total, link per task to `/tasks/:taskId`.
- **D4 Task detail** `/tasks/:taskId`: title, description, status, priority, due date, assignee, creator, created/updated, archived badge, link back. Comments and activity sections are added by DEV-16 via a clearly marked slot.
- **D5 States.** Loading skeleton/text, empty ("No tasks match") and error with retry through `QueryState` (FR-UI-010); a 404 task shows a not-found message.
- **D6 Stand-ins.** The branch includes a minimal `lib/api-client.ts` (`apiFetch` with bearer token, `ApiError`), `lib/utils.ts` (`cn`) and shadcn-style `button/input/badge`, at DEV-14's paths. DEV-14's richer versions replace them at merge.

## Docs checked

Context7 at apply time: React Router `useSearchParams`, TanStack Query v5 `placeholderData`/`keepPreviousData`.
