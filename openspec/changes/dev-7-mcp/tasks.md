## Conventions

- Shell: Node 22, `pnpm` only. Scenarios: 17 in one capability (`mcp-integration`).
- Branch: `feature/docs/DEV-7-mcp`. Commits: `type(area): <n.m> subject` with footer `Refs: DEV-7`, area `workflow`; test-first commits use type `test`. Claude commits after the blanket approval of this run, per `apply-delegation.md`; specs and production code never share a commit (here everything is docs and scripts, no spec file changes after Gate 1).
- Library APIs to check with Context7 before use: `@upstash/context7-mcp` (tool names, version) in task 3.3. No other library is added.
- Test titles: `DEV-1004-AC-n: <scenario name>` (workflow ticket, design D4). Test file for all scenarios: `scripts/check-mcp-docs.test.mjs`.

## 1. Config and secrets [docs]

- [x] 1.1 [docs] Test task (`test-writer`): `scripts/check-mcp-docs.test.mjs`, requirements "Context7 server pinned" and "MCP evidence and secrets". Scenarios: Context7 server pinned with exact version; Floating Context7 version rejected; MCP config holds no credentials; Credential in MCP config rejected.
- [ ] 1.2 [docs] Implement `checkMcpConfig` in `scripts/check-mcp-docs.mjs` (turns 1.1 green). Pin check: user runs `! npm view @upstash/context7-mcp version`; then add `context7` to `.mcp.json` with that exact version. Verify: `pnpm exec vitest run scripts/check-mcp-docs.test.mjs`.
- [ ] 1.3 [docs] Checkpoint 1 (full, `checkpoint.md`; coverage on `scripts/check-mcp-docs.mjs`; database check n/a).

## 2. Approval and command checks [docs]

- [ ] 2.1 [docs] Test task (`test-writer`): same file, requirements "Write operations need approval" and the command part of "Jira failure handling". Scenarios: Jira write tools require approval; Write tool outside the ask list rejected; Commands ask before a Jira write; Jira commands state every failure case; Command without the failure rule rejected.
- [ ] 2.2 [docs] Implement `checkSettingsWrites` and `checkCommands`, the CLI, `check:mcp-docs` script and the `lint` chain in `package.json` (turns 2.1 green; the real commands already contain the rules). Allow only the read-only Context7 tools in `.claude/settings.json` (names confirmed in 3.3).
- [ ] 2.3 [docs] Checkpoint 2.

## 3. Evidence log [docs]

- [ ] 3.1 [docs] Test task (`test-writer`): same file, requirements "Context7 lookup recorded", the log part of "Jira failure handling" and "Failure log entries". Scenarios: Context7 lookup recorded with library, version and time; Lookup row without version rejected; Missing ticket reported as not found; Disabled MCP and cleared auth recorded as a stop; Unsupported operation recorded; Failure log missing a case rejected; Failure log entries carry date and time; Log entry without date rejected.
- [ ] 3.2 [docs] Implement `checkContext7Log` and `checkFailureLog`; add the empty tables and the Context7 section, operations and approval policy to `docs/mcp-setup.md`. The real-repo scenarios stay red until 3.3 to 3.5.
- [ ] 3.3 [docs] **User stop:** restart Claude Code so the Context7 server loads (OD-4). Then run two lookups (Express 5 error handling, Sequelize transactions), record library, version, topic and date/time in the "Context7 lookups" table, confirm the tool names for the allow list, and update `docs/versions.md`.
- [ ] 3.4 [docs] Record the missing-ticket drill (`DEV-999`, 2026-11-01 10:12 IST, already run live: HTTP 404) and run the live drills with the user for "MCP disabled", "auth cleared" and "unsupported operation" (for example a Confluence write the policy forbids); record each with date/time in the "Failure test log". **User stop:** the user runs `/mcp` to disconnect and clear auth, then reconnects.
- [ ] 3.5 [docs] Checkpoint 3 (turns every real-repo scenario green).

## 4. Verification [docs]

- [ ] 4.1 [docs] Full-diff run of the checkpoint (`pnpm build`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test --coverage`, `pnpm exec openspec validate dev-7-mcp --strict`), `reviewer` on `git diff main...HEAD`, then `/opsx:verify dev-7-mcp` in a fresh session.

## Scenario to test map

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| mcp-integration | Context7 server pinned with exact version | DEV-1004-AC-1 | scripts/check-mcp-docs.test.mjs | 1.1 |
| mcp-integration | Floating Context7 version rejected | DEV-1004-AC-1 | scripts/check-mcp-docs.test.mjs | 1.1 |
| mcp-integration | MCP config holds no credentials | DEV-1004-AC-6 | scripts/check-mcp-docs.test.mjs | 1.1 |
| mcp-integration | Credential in MCP config rejected | DEV-1004-AC-6 | scripts/check-mcp-docs.test.mjs | 1.1 |
| mcp-integration | Jira write tools require approval | DEV-1004-AC-4 | scripts/check-mcp-docs.test.mjs | 2.1 |
| mcp-integration | Write tool outside the ask list rejected | DEV-1004-AC-4 | scripts/check-mcp-docs.test.mjs | 2.1 |
| mcp-integration | Commands ask before a Jira write | DEV-1004-AC-4 | scripts/check-mcp-docs.test.mjs | 2.1 |
| mcp-integration | Jira commands state every failure case | DEV-1004-AC-3 | scripts/check-mcp-docs.test.mjs | 2.1 |
| mcp-integration | Command without the failure rule rejected | DEV-1004-AC-3 | scripts/check-mcp-docs.test.mjs | 2.1 |
| mcp-integration | Context7 lookup recorded with library, version and time | DEV-1004-AC-1 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Lookup row without version rejected | DEV-1004-AC-1 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Missing ticket reported as not found | DEV-1004-AC-2 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Disabled MCP and cleared auth recorded as a stop | DEV-1004-AC-3 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Unsupported operation recorded | DEV-1004-AC-3 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Failure log missing a case rejected | DEV-1004-AC-2 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Failure log entries carry date and time | DEV-1004-AC-5 | scripts/check-mcp-docs.test.mjs | 3.1 |
| mcp-integration | Log entry without date rejected | DEV-1004-AC-5 | scripts/check-mcp-docs.test.mjs | 3.1 |
