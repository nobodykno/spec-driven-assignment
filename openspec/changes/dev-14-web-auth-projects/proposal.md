Ticket: DEV-14
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-14 Frontend — authentication and project pages

> Jira `DEV-14` is "[DEV-1011] Frontend — authentication and project pages [PARALLEL after API contracts]". Assignment ID **DEV-1011**. Built in its own worktree, in parallel with DEV-15.

## Why

Users need to register, log in and manage projects and members. DEV-14 also lays the web foundation (Tailwind + shadcn/ui components, router, TanStack Query client, API client with token refresh, auth store) that DEV-15/16 build on.

## FRS requirements covered

FR-UI-001, 002, 003, 004, 010; FR-AUTH-005 (redirect of unauthenticated users to /login); NFR-USA-001.

## SDS sections followed / changed

- **Followed:** §3 web structure, §7.2 (access token in memory), §9.1 routes, §9.2 state/data fetching, §9.3 UI.
- **Changed:** none.

## Affected packages

`apps/web` only (plus `docs/versions.md`, `pnpm-lock.yaml`). The DEV-1 status indicator is kept on the shell.

## New dependencies (exact versions, checked with `pnpm view` on 2026-10-30)

| Package | Version | Reason |
| --- | --- | --- |
| react-router | 8.5.1 | Routing, protected routes (SDS §4) |
| @tanstack/react-query | 5.105.0 | Server state (SDS §9.2) |
| react-hook-form | 7.91.0 | Forms (SDS §9.2) |
| @hookform/resolvers | 6.0.2 | `zodResolver` with `@app/shared` schemas |
| tailwindcss, @tailwindcss/vite | 4.3.3 | Styling (SDS §4) |
| class-variance-authority | 0.7.1 | shadcn/ui variants |
| clsx | 2.1.1 | shadcn/ui `cn` helper |
| tailwind-merge | 3.7.0 | shadcn/ui `cn` helper |
| @radix-ui/react-slot | 1.5.0 | shadcn/ui Button `asChild` |
| @radix-ui/react-label | 2.1.17 | shadcn/ui Label |
| @testing-library/user-event | 14.6.8 (dev) | Component tests |

DEV-15/16 reuse the same exact versions; no other package is added.

## Database changes

None.

## Rollback plan

Revert the merge commit; the backend is unaffected.

## Ticket dependencies

- DEV-9 and DEV-10 (contracts and endpoints) — **To Do** at proposal time; built before this change in the batch.

## Deliberate deviations (user instruction for this batch)

Minimal component tests now; full RTL coverage, Playwright E2E and independent review are deferred (DEV-19/20).

## Open questions

None.
