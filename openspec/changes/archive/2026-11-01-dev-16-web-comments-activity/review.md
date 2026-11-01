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

## 2026-11-01 | review | fresh-session review | FAIL
head: 855d8eb
round: 2

| Check | Command | Result |
|-------|---------|--------|
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (0 high, 3 medium, 5 low); supersedes the PASS section above, which deferred the mediums |

Findings: medium: comment edit draft not validated with the shared schema; medium: no tests for comment edit success and delete; medium: no edit-form PATCH 400/409 tests and no refetch assertion.
Next: fix and verify again

## 2026-11-01 | review | fresh-session review | PASS
head: fee4260
round: 3

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 421 root tests and all package tests passed |
| coverage | pnpm --filter web test --coverage | web all files 91.6% lines, task-form.tsx 100% |
| spec | openspec validate dev-16-web-comments-activity --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23), round 2 | APPROVE (0 critical, 0 high, 0 medium, 3 low) |
| security | read-only general-purpose agent with a security brief (no security-auditor agent exists) | APPROVE (0 critical, 0 high, 0 medium, 3 low) |
| database | database | n/a (no database changes in this change) |

Findings: Fixed: commit 1f51c3c tests, 90b505e validate the edit draft with UpdateCommentSchema, fee4260 send the trimmed body. Only lows remain.
Next: /create-pr dev-16-web-comments-activity
