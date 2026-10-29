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

| Jira key | Assignment ID | Summary                    |
|----------|---------------|----------------------------|
| DEV-1    | DEV-1001      | `[DEV-1001] Project setup` |

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

- Read-only tools may be used freely to fetch tickets during `/sdd:propose`
  and later steps.
- **Write tools (create, edit, transition, comment, worklog, link, and any
  Confluence or Compass write) need the user's explicit approval for each
  call (Rule 17).** No write tool was used during setup.

## Failure handling

Stop and report the problem to the user. Do not guess or carry on if:

- the MCP server is unavailable or not connected,
- authentication fails or has expired (re-run `/mcp`),
- the ticket does not exist or is not visible, or
- the response is malformed or missing the summary, status or description.

A local fixture in `docs/tickets/` may stand in for the live ticket **only
when the user explicitly approves it**. Every artifact built from it must
be clearly labelled **FIXTURE**, so it is never mistaken for live tracker
data.
