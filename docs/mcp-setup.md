# Issue-tracker MCP setup

How Claude Code connects to the issue tracker for this project. Every value
below comes from a real session; nothing is a placeholder.

## Tracker

| Item        | Value                                   |
|-------------|-----------------------------------------|
| Tracker     | Jira Cloud                              |
| Site        | `paramjitjena6.atlassian.net`           |
| Cloud ID    | `07a3235b-8236-4749-bef0-07abde14ebc8`  |
| Project     | `DEV` ("My Software Team")              |
| MCP server  | `atlassian` (`https://mcp.atlassian.com/v1/mcp`) |

## Ticket key mapping

Jira numbers issues from 1, but the assignment uses its own IDs. Each
assignment ID is written at the start of the Jira summary.

| Jira key | Assignment ID | Change name             | Summary |
|----------|---------------|-------------------------|---------|
| DEV-1    | DEV-1001      | `project-setup`         | `[DEV-1001] Project setup` |
| DEV-5    | DEV-1002      | `claude-setup`          | `[DEV-1002] Claude Code setup — skills, hooks, permissions and project instructions` |
| DEV-6    | DEV-1003      | `agents`                | `[DEV-1003] Autonomous agents — implementation, testing, independent review and coordination` |
| DEV-7    | DEV-1004      | `mcp`                   | `[DEV-1004] MCP — Context7 and issue-tracker integration, permissions and failure handling` |
| DEV-8    | DEV-1005      | `openspec-workflow`     | `[DEV-1005] OpenSpec workflow — ticket-to-change traceability, approval gates, verification and archival` |
| DEV-9    | DEV-1006      | `auth`                  | `[DEV-1006] Authentication — registration, login, logout and token handling` |
| DEV-10   | DEV-1007      | `projects`              | `[DEV-1007] Projects — CRUD, membership and access control [PARALLEL after approved contracts]` |
| DEV-11   | DEV-1008      | `tasks`                 | `[DEV-1008] Tasks — CRUD, assignment, status, priority and deadlines [PARALLEL after auth and API contracts]` |
| DEV-12   | DEV-1009      | `task-filtering`        | `[DEV-1009] Task filtering — pagination, sorting and filtering` |
| DEV-13   | DEV-1010      | `comments-activity`     | `[DEV-1010] Comments and activity history` |
| DEV-14   | DEV-1011      | `web-auth-projects`     | `[DEV-1011] Frontend — authentication and project pages [PARALLEL after API contracts]` |
| DEV-15   | DEV-1012      | `web-tasks`             | `[DEV-1012] Frontend — task list, filters and detail pages [PARALLEL after API contracts]` |
| DEV-16   | DEV-1013      | `web-comments-activity` | `[DEV-1013] Frontend — comments, activity history and task editing` |
| DEV-17   | DEV-1014      | `worktrees`             | `[DEV-1014] Git worktrees — parallel development, integration and conflict resolution` |
| DEV-18   | DEV-1015      | `graph-tools`           | `[DEV-1015] Codebase graph setup — Code Review Graph and Graphify, queries and token-efficiency evaluation` |
| DEV-19   | DEV-1016      | `testing`               | `[DEV-1016] Testing — unit, integration, authorization, regression and end-to-end tests` |
| DEV-20   | DEV-1017      | `independent-review`    | `[DEV-1017] Independent review — specification compliance, security, graph-assisted impact analysis and test coverage` |
| DEV-21   | DEV-1018      | `final-integration`     | `[DEV-1018] Final integration — end-to-end user journey, issue-to-PR traceability and workflow demonstration` |

DEV-2 is not visible, and DEV-3 / DEV-4 are unrelated test issues ("Task 3",
"Subtask 2.1"); they are not part of the backlog. Tickets DEV-1002…DEV-1018
were created with `createJiraIssue` on 2026-10-30, after the user approved
the list.

Fetch the ticket by its Jira key (`DEV-1`). Use the assignment ID from the
summary when you name the branch, commits and OpenSpec change (`DEV-1001`).

## Setup

The server was added once, at project scope:

```sh
claude mcp add --transport http --scope project atlassian https://mcp.atlassian.com/v1/mcp
```

That command wrote `.mcp.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    }
  }
}
```

## Authentication

- Sign in with OAuth: run `/mcp` in Claude Code, pick `atlassian` and
  complete the browser login. The session reported:
  `Authentication successful. Connected to atlassian.`
- Claude Code stores the OAuth tokens outside the repo. **No tokens or
  secrets are committed.** `.mcp.json` holds only the server URL.

## Live lookup evidence

- **Date:** 2026-10-29, evening IST. The lookup ran just before this
  document was written at 23:22 IST.
- **Call:** `getJiraIssue` with cloudId `paramjitjena6.atlassian.net`,
  issue `DEV-1`, `updateHistory: false`. This was read-only and was run
  twice, with the same result both times.
- **Key:** DEV-1
- **Summary:** `[DEV-1001] Project setup`
- **Status:** To Do
- **Issue last updated:** 2026-10-29T21:08:26+05:30

Acceptance criteria retrieved:

1. WHEN `pnpm install` runs THEN all workspaces install with no errors
2. WHEN `pnpm db:up` runs THEN PostgreSQL 16 starts on port 5433 and is healthy
3. WHEN GET /health is called on gateway, auth and tracker THEN each returns
   200 `{"status":"ok"}` (FR-SYS-001)
4. WHEN the database is down THEN auth/tracker /health returns 503 (FR-SYS-001)
5. WHEN `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` run THEN all pass
6. WHEN the web app opens THEN it shows "API: online" via the gateway
7. No floating versions ("latest", unpinned Docker tags) anywhere

**Note:** Jira has no separate acceptance-criteria field for this project.
The criteria are written inside the issue **description**, under an
`Acceptance criteria:` heading. Parse them from the description.

## Supported tools

Tools exposed by the `atlassian` MCP server (`mcp__atlassian__*`):

### Read-only

| Area       | Tools |
|------------|-------|
| Jira       | `getJiraIssue`, `searchJiraIssuesUsingJql`, `getVisibleJiraProjects`, `getJiraProjectIssueTypesMetadata`, `getJiraIssueTypeMetaWithFields`, `getTransitionsForJiraIssue`, `getJiraIssueRemoteIssueLinks`, `getIssueLinkTypes`, `lookupJiraAccountId` |
| Confluence | `getConfluenceSpaces`, `getConfluencePage`, `getPagesInConfluenceSpace`, `getConfluencePageDescendants`, `getConfluencePageFooterComments`, `getConfluencePageInlineComments`, `getConfluenceCommentChildren`, `searchConfluenceUsingCql` |
| Compass    | `getCompassComponent`, `getCompassComponents`, `getCompassCustomFieldDefinitions` |
| General    | `atlassianUserInfo`, `getAccessibleAtlassianResources`, `search`, `fetch`, `getContentFormatGuide` |

### Write

| Area       | Tools |
|------------|-------|
| Jira       | `createJiraIssue`, `editJiraIssue`, `transitionJiraIssue`, `addCommentToJiraIssue`, `addWorklogToJiraIssue`, `createIssueLink` |
| Confluence | `createConfluencePage`, `updateConfluencePage`, `createConfluenceFooterComment`, `createConfluenceInlineComment` |
| Compass    | `createCompassComponent`, `createCompassComponentRelationship`, `createCompassCustomFieldDefinition` |

## Policy

- Read-only tools may be used freely to fetch tickets during `/opsx:explore` and `/opsx:propose`
  and later steps.
- **Write tools (create, edit, transition, comment, worklog, link, and any
  Confluence or Compass write) need the user's explicit approval for each
  call (Rule 17).** No write tool was used during setup.

### Write log

| Date       | Tool               | What                                                         | Approval |
|------------|--------------------|--------------------------------------------------------------|----------|
| 2026-10-30 | `createJiraIssue`  | Created 17 Tasks DEV-5…DEV-21 (DEV-1002…DEV-1018), in order   | User approved the ticket list first |
| 2026-10-30 | `createIssueLink`  | Created 46 `Blocks` links ("is blocked by") from each ticket's *Depends on*; non-ticket dependencies ("approved API contracts") are not linked | User approved the link list first |

The link direction was checked after the first link (DEV-5 shows "is blocked
by DEV-1"). Spot-check afterwards: DEV-17, DEV-19 and DEV-21 each list the
expected blockers.

## Failure handling

Stop and report the problem to the user. Do not guess or carry on if:

- the MCP server is unavailable or not connected,
- authentication fails or has expired (re-run `/mcp`),
- the ticket does not exist or is not visible, or
- the response is malformed or missing the summary, status or description.

No offline fixture is kept. Jira is the only source of ticket data. If
Jira or the MCP is unavailable, stop, document the failure in this file,
and wait for the user.

## Context7

Context7 serves current library documentation to Claude Code. It is configured in `.mcp.json` as a
local stdio server with an exact pinned version and no key or other secret:

```json
"context7": { "type": "stdio", "command": "npx", "args": ["-y", "@upstash/context7-mcp@4.4.4"] }
```

- Version check on 2026-11-01 10:35 IST: `pnpm view @upstash/context7-mcp` returned latest `4.4.4`,
  published 2026-10-19 (more than two weeks old), binary `context7-mcp`.
- Claude Code must be restarted after `.mcp.json` changes, and the server approved once.
- Only read-only Context7 tools are allowed in `.claude/settings.json`; there is no write tool.
- `scripts/check-mcp-docs.mjs` (part of `pnpm lint`) rejects an unpinned or floating version and any
  credential in `.mcp.json`.

## Context7 lookups

| Date (IST) | Library | Version | Topic | Result |
| ---------- | ------- | ------- | ----- | ------ |
| 2026-11-01 10:46 | Express (`/expressjs/express`) | 5.3.0 | error handling middleware and rejected promises in async handlers | Express 5 routes returned or rejected promises; the default error handler logs the full error object |
| 2026-11-01 10:47 | Sequelize (`/sequelize/website`, 6.x docs) | 6.37.8 | managed transactions with `sequelize.transaction` | callback resolves: commit; callback throws: rollback and the call rejects. The version-pinned id `/sequelize/sequelize/v6.37.7` matched nothing, so the website id was used |

Tools confirmed on 2026-11-01: `mcp__context7__resolve-library-id` and `mcp__context7__query-docs`
(both read-only, both allowed in `.claude/settings.json`).

## Operations and approval policy

- Read-only Jira tools (`getJiraIssue`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue`, ...) are
  used freely to fetch tickets. The Jira workflow has the statuses To Do, In Review and Done.
- Every write tool (create, edit, transition, comment, worklog, link) is in the `ask` list of
  `.claude/settings.json`, so each call needs the user's explicit approval, and the commands that write
  (`/opsx:propose`, `/opsx:archive`, `/create-pr`, `/frs-ticket`) say so. `scripts/check-mcp-docs.mjs` checks both.
- Failures stop the work: MCP disabled or unauthenticated, ticket missing, unsupported operation or a
  malformed response. The agent reports it and never invents ticket data. No offline fixture exists.

## Failure test log

| Date (IST)       | Case                  | Call                                       | Result                                                                      |
| ---------------- | --------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| 2026-11-01 10:12 | missing ticket        | `getJiraIssue` `DEV-999`, read-only        | not found (HTTP 404, "Issue does not exist or you do not have permission"); no data invented |
