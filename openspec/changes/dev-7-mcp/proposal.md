## Why

Ticket **DEV-7** (assignment ID **DEV-1004**): complete the MCP integration. Today only the Atlassian (Jira) MCP is configured (`.mcp.json`, `docs/mcp-setup.md`); Context7 is not (`docs/versions.md` line 94 says library APIs were checked "against each" other source because Context7 is not configured). The ticket also asks for proof that Jira failures stop work safely and that writes need approval.

This is a workflow ticket: FRS section 5 maps no FR IDs to DEV-1004, so the change traces to the ticket's acceptance criteria (AC-1 to AC-6 below) and to assignment Rules 1, 5, 17, 18, 19. FRS/SDS sections: SDS 4 (technology stack, "Context7 MCP, issue-tracker MCP"), SDS 14 (D-04 asks to verify library versions with Context7).

Observed (cite files): `.mcp.json` has only `atlassian`; `docs/mcp-setup.md` has the Jira tool list, write policy and failure handling but no Context7 section; `.claude/settings.json` lists the six Jira write tools under `ask`; `/opsx:*` commands already contain Jira failure text (`.claude/rules/handoff.md` rule 7).

## Ticket

- Key: DEV-7 (DEV-1004), summary "MCP — Context7 and issue-tracker integration, permissions and failure handling", status **To Do** (live fetch 2026-11-01 10:10 IST).
- Blockers ("is blocked by"): DEV-5 (DEV-1002) **Done**.
- Acceptance criteria (parsed from the description):
  - AC-1 WHEN Context7 is queried for a library API THEN the result and library version are recorded.
  - AC-2 WHEN a non-existent ticket is requested THEN the agent reports "not found" and does not invent data.
  - AC-3 WHEN the Jira MCP is disabled or unauthenticated THEN the agent stops and reports the failure.
  - AC-4 WHEN a write operation (create/edit/transition/comment) is needed THEN the agent asks for explicit approval first.
  - AC-5 All results are recorded with date/time in `docs/mcp-setup.md`.
  - AC-6 No tokens or credentials are committed.
- Scope also lists: Context7 in `.mcp.json` (pinned version, no secrets); a demonstrated lookup (e.g. Express 5 error handling, Sequelize transactions); extended `docs/mcp-setup.md` (supported operations, approval policy); failure tests: missing ticket (DEV-999), MCP disabled, auth cleared, unsupported operation.
- Evidence already gathered: `getJiraIssue DEV-999` on 2026-11-01 10:12 IST returned HTTP 404 "Issue does not exist or you do not have permission to see it" (read-only).

## What Changes

- `[docs]` Add the Context7 MCP server to `.mcp.json` with an exact pinned version and no secrets; allow only its read-only tools in `.claude/settings.json`.
- `[docs]` Record a Context7 lookup (library, version, topic, date/time) for two APIs the project uses.
- `[docs]` Extend `docs/mcp-setup.md`: Context7 section, supported operations, write-approval policy, a dated failure-test log (missing ticket, MCP disabled, auth cleared, unsupported operation).
- `[docs]` Add an automated check (script test) that every command that reads or writes Jira states the four failure cases and the approval rule, so the behaviour cannot silently drift.

## Traceability

| FR ID | FRS wording (short) | Capability | Spec requirement |
|-------|---------------------|------------|------------------|
| none (workflow ticket, FRS section 5) | AC-1 Context7 lookup recorded | mcp-integration | Context7 server and recorded lookup |
| none | AC-2, AC-3 failure handling | mcp-integration | Jira failure handling |
| none | AC-4 write approval | mcp-integration | Write operations need approval |
| none | AC-5, AC-6 records, no secrets | mcp-integration | MCP evidence and secrets |

## Open decisions

| ID | Question | Options | Recommendation | Impact if wrong | Status | Resolved by |
|----|----------|---------|----------------|-----------------|--------|-------------|
| OD-1 | How is "MCP disabled", "auth cleared" and "unsupported operation" proven? Disconnecting the Jira MCP also cuts this session's own ticket access. | A: live drill with you (you run `/mcp` disconnect/clear, I attempt a fetch, record the stop) plus the automated command-text check. B: automated command-text check only (no live drill). C: only a written procedure, no evidence | A, because the ticket asks for the failure tests and the live evidence is what AC-3 needs; B stays as the regression guard | scope (needs your action during apply) | Resolved | user chose A, 2026-11-01 |
| OD-2 | Context7 transport and pinning | A: stdio `npx -y @upstash/context7-mcp@<exact version>` (pinnable). B: remote HTTP (cannot be pinned) | A, because the ticket requires a pinned version | scope | Resolved | ticket scope, 2026-11-01 |
| OD-3 | Exact Context7 package version | Pin the latest stable at apply time, checked against the registry | Pin at apply (registry check is denied to me by permission; you may need to run `npm view @upstash/context7-mcp version` with `!`) | none | Assumed | assumption, changeable at Gate 1 |
| OD-4 | Context7 lookups need the new server loaded: Claude Code must be restarted after `.mcp.json` changes | You restart and approve the server once | Accept the one restart; the lookup task waits for it | none | Assumed | assumption, changeable at Gate 1 |

## Out of scope

- Any Jira write beyond the approved transitions of this run; creating or editing tickets; Confluence/Compass use (FRS 1.3 and SDS 13 unaffected).
- Replacing the Atlassian MCP, storing tokens in the repo, offline Jira fixtures (the ticket forbids them).
- Application code and the FRS/SDS requirements (no FR IDs mapped).

## Capabilities

### New Capabilities
- `mcp-integration`: Context7 and Jira MCP configuration, failure handling, write approval and recorded evidence.

### Modified Capabilities
None.

## Impact

- `.mcp.json`, `.claude/settings.json` (Context7 read-only tools only).
- `docs/mcp-setup.md`, `docs/versions.md` (replace the "Context7 not configured" note when proven).
- New script `scripts/check-mcp-docs.mjs` plus test (wired into `pnpm lint` like the other `check:*` scripts) and `package.json` script entry. No database change: **No schema change**.
- New dependencies: **None** (Context7 runs through `npx`, pinned; nothing is added to `package.json` dependencies).
- Existing scenarios that must stay green: `check-claude-settings`, `check-agents`, `check-workflow` tests.

## Rollback

Revert the commits. Removing the `context7` entry from `.mcp.json` and the allow entries from `.claude/settings.json` returns to the current state. No data or migrations.

## Docs follow-up

`docs/mcp-setup.md` (Context7 section and failure log), `docs/versions.md` (Context7 now configured), SDS 14 D-04 status note if the lookup settles the version question. At archive, record the capability `mcp-integration` as Verified.
