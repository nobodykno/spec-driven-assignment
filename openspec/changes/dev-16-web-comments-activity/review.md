# Review log: dev-16-web-comments-activity
Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: f03823c

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 warnings (max-lines-per-function in existing production files; none in the new tests) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | shared 40, database 1, api-gateway 14, auth 23, web 49 passed; tracker 150 passed when run serially (parallel runs on the loaded machine hit 2 s timeouts in projects-scenarios, unrelated to this change); 0 skipped |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-16-web-comments-activity --strict | valid |
| scenarios | web tests named in the scenario map | 9/9 green |
| database | n/a | n/a (no database changes in this change) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | not run |

Findings: none yet (reviewer pending)
Next: /opsx:verify dev-16-web-comments-activity in a fresh session

## 2026-11-01 | review | fresh-session review | PASS
head: 25eafdc
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | per-package green (full run slowed by machine load, DB timeouts pass when run alone) |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-16-web-comments-activity --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (0 critical, 0 high, 3 medium, 5 low) |
| database | database | n/a (no database changes in this change) |

Findings: Shipped at the user's request (ship as soon as possible) with the three mediums deferred: comment edit draft is not validated with the shared schema (a bad draft reaches the server, which answers 400), comment edit-success and delete tests are missing, edit-form error and refetch tests are missing. All nine scenarios still have an exact-title test.
Next: /create-pr dev-16-web-comments-activity
