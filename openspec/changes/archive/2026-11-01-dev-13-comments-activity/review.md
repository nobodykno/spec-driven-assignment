# Review log: dev-13-comments-activity

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: 6df3285
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 warnings (max-lines-per-function in apps/web and packages/database migrations, none in files of this change); pnpm forwards no flag, so the run is plain `pnpm lint` |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | tracker 164, shared 40, database 1, gateway 14, auth 23, web 41 passed, 0 failed; root hooks file 77 (one timing flake under load, 77/77 on re-run alone), 0 skipped |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-13-comments-activity --strict | valid |
| scenarios | services/tracker/test/comments-scenarios.test.ts | 14/14 green |
| database | reviewer (database checklist) | n/a (no database changes in this change) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | unavailable |

Findings: production defect found while checking concurrency (not fixed, docs and tests only). services/tracker/src/services/task-service.ts `mutate` (about lines 147-155) reads the task inside the transaction without a row lock, so four concurrent PATCH status requests TODO to IN_PROGRESS all returned 200 and stored four TASK_STATUS_CHANGED activity entries (expected: one success, the others 409 INVALID_STATUS_TRANSITION). Proven in a scratch test, not committed.
Next: /opsx:verify dev-13-comments-activity in a fresh session

## 2026-11-01 | review | fresh-session review | PASS
head: 506a3f2
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | per-package green (full run slowed by machine load, DB timeouts pass when run alone) |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-13-comments-activity --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | APPROVE (0 critical, 0 high, 1 medium, 7 low) |
| database | reviewer (database checklist) | PASS by reading: FKs, comments(task_id, created_at) and activities(task_id, created_at DESC) indexes, real down, activity append-only; migrate and undo not run |

Findings: medium: 409 on editing or deleting a comment on an archived task or project has no scenario or test; accepted as a retroactive gap. Lows: intermediate calls in Entry stored not status-asserted, boundaries inside one scenario test, tie-break on random UUID. The task status race found by the prep agent is fixed in dev-11-tasks (2744c07).
Next: /create-pr dev-13-comments-activity
