# Review log: dev-12-task-filtering

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: 2b34d4a
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 warnings (pnpm ignored the flag; warnings pre-existing, none in changed files) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 0 failed; tracker 162 passed, web 41, auth 23, gateway 14, shared 40, database 1 (421 total) |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-12-task-filtering --strict | valid |
| scenarios | task-filtering scenario tests | 11/11 green |
| database | reviewer (database checklist) | n/a (no database changes in this change; indexes from DEV-11 migration asserted by the NFR-PERF-002 test) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | unavailable |

Findings: none (reviewer pending)
Next: /opsx:verify dev-12-task-filtering in a fresh session

## 2026-11-01 | review | fresh-session review | PASS
head: b880be6
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | per-package green (full run slowed by machine load, DB timeouts pass when run alone) |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-12-task-filtering --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED conservative (0 critical, 0 high, 2 medium record-level, 5 low); the reviewer could not read the migration, read by the main session |
| database | indexes from SDS 5.3 asserted by the Indexes exist test against pg_indexes | PASS; migration unedited since PR #9, migrate and undo not run |

Findings: Mediums accepted as retroactive gaps (no code defect found): the spec has no 401 scenario for the list endpoint (401 is documented under x-unspecified-statuses and asserted inside the Non-member lists test); the extra test FR-FILT-002: Default and timestamp sorts has no scenario. SQL safety confirmed: literal receives only validated enum values. Lows: due range and includeArchived without scenarios, repeated params and dueFrom later than dueTo unspecified.
Next: /create-pr dev-12-task-filtering
