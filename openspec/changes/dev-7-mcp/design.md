## Context

DEV-7 (DEV-1004) completes the MCP integration. Jira (Atlassian MCP) works and is documented; Context7 is missing. The ticket's failure and approval criteria are agent behaviour, so the repository needs (a) configuration, (b) dated evidence in `docs/mcp-setup.md`, and (c) a small automated check so the rules cannot drift. Follows SDS 4 (technology stack) and SDS 14 D-04.

## Goals / Non-Goals

Goals: pinned Context7 server, recorded lookup, dated failure drills, write-approval proof, no credentials in MCP files, a `pnpm lint` check that keeps these true.
Non-goals: new Jira features, replacing the Atlassian MCP, application code, any FR change.

## Contract

No `packages/shared` schema is added or changed (no endpoint, no form). The only "contract" is the shape of three tables in `docs/mcp-setup.md` read by `scripts/check-mcp-docs.mjs`:

- "Context7 lookups": `| Date (IST) | Library | Version | Topic | Result |`
- "Failure test log": `| Date (IST) | Case | Call | Result |` with the cases `missing ticket`, `MCP disabled`, `auth cleared`, `unsupported operation`
- timestamps are `YYYY-MM-DD HH:MM`.

## Data model

No schema change (SDS 5 untouched).

## Decisions

- **D1 (resolves OD-2): stdio `npx -y @upstash/context7-mcp@<exact>`.** Reason: the ticket requires a pinned version; the remote HTTP endpoint cannot be pinned. Rejected: remote HTTP.
- **D2 (resolves OD-1, option A): live drill plus automated check.** The drill records the real behaviour (AC-2, AC-3) with date and time; the script keeps the command texts, the settings `ask` list and the log honest after the drill. Rejected: check only (no evidence), written procedure only.
- **D3: one script, `scripts/check-mcp-docs.mjs`, pure functions plus a CLI**, wired as `pnpm check:mcp-docs` into `pnpm lint`, the same pattern as `check-workflow.mjs` and `check-agents.mjs`. Rejected: extending `check-claude-settings.mjs` (it checks hooks and permissions only; mixing doc-log checks makes both harder to test).
- **D4: test titles use the ticket acceptance-criterion ID.** This workflow ticket has no FR IDs, so tests are titled `DEV-1004-AC-n: <scenario name>`; scenario names end with `[DEV-1004-AC-n]`.
- **D5 (OD-3, OD-4 assumptions): the version is checked against the registry at apply, and the lookup waits for one Claude Code restart.** Registry commands are denied to the agent by permission; the user may need to run `! npm view @upstash/context7-mcp version`.

## Layer plan

- `[docs]` `.mcp.json` (add `context7`), `.claude/settings.json` (allow only the read-only Context7 tools; leave Jira write tools in `ask`), `docs/mcp-setup.md` (Context7 section, operations, approval policy, the two tables), `docs/versions.md`.
- `[docs]` `scripts/check-mcp-docs.mjs`, `scripts/check-mcp-docs.test.mjs`, `package.json` script and `lint` chain.
- No service, web, database or e2e changes.

## Security and privacy

SDS 7 and NFR-SEC-005 apply: `.mcp.json` holds only the command, args and URL, never keys; Context7 works without an API key for basic lookups. The check rejects environment blocks, headers and token-shaped strings. Logs hold ticket keys and dates only, no ticket text beyond the already public summary. No `.env` file is read.

## Docs checked

Context7 package and tool names are verified at apply time through the lookup itself (library `@upstash/context7-mcp`, tools `resolve-library-id` and `get-library-docs`); until the server is loaded the names in the settings allow list are unconfirmed and are checked in task 3.3. `npm view` is permission-denied for the agent.

## Risks / Trade-offs

- The new server needs a restart and a one-time approval prompt: apply pauses there (OD-4).
- The live drill disconnects Jira, so it runs last in the group and the session reconnects afterwards (needs the user).
- A pinned `npx` package still downloads at first run; accepted, the version is exact.

## Migration and rollback

None; revert the commits. No data, no migrations.

## Open questions

None open: OD-1 resolved (option A), OD-2 resolved, OD-3 and OD-4 assumed (see proposal).
