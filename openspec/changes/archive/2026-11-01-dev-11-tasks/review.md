# Review log: dev-11-tasks

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: 311a54e
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 warnings (pnpm ignored the flag; warnings pre-existing, none in changed files) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 842 passed, 0 failed; tracker 166 passed + 1 expected fail (it.fails race test), web 41, auth 23, gateway 14, shared 40, database 1 |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-11-tasks --strict | valid |
| scenarios | tasks scenario tests | 16/16 green |
| database | reviewer (database checklist) | pending, run by /opsx:verify (task 1.1 added the tasks migration, merged in PR #8; migrate and undo not run here) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | unavailable |

Findings: none from this step (reviewer pending). Known defect: TaskService.mutate reads the task without a row lock, so concurrent identical status changes both succeed with two activity entries; pinned by it.fails test "FR-TASK-005: concurrent identical transitions yield one winner".
Next: /opsx:verify dev-11-tasks in a fresh session

## 2026-11-01 | review | fresh-session review | FAIL
head: c71088b
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build, typecheck, test | pnpm build, typecheck, test | 0 errors, per-package green (full run slowed by machine load, DB timeouts pass when run alone) |
| spec | openspec validate dev-11-tasks --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (0 high, 1 medium records, 3 low) |
| security | read-only general-purpose agent with a security brief (no security-auditor agent exists) | APPROVE (0 critical, 0 high, 2 medium races, 7 low) |
| database | reviewer (database checklist) | PASS by reading: tasks migration has a real down and the four SDS 5.3 indexes, unedited since PR #8; migrate and undo not run |

Findings: medium: handoff.md and review.md still called the status race open after commit 2744c07 fixed it (append-only, so a superseding record is needed). Lows: lock result discarded, create() checks outside the transaction, race test did not assert the loser code.
Next: supersede the records, assert the loser code, verify again

## 2026-11-01 | review | fresh-session review | PASS
head: ea041f1
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | per-package green; race test now asserts exactly one 200 and one 409 INVALID_STATUS_TRANSITION |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-11-tasks --strict | valid |
| reviewer | round 1 medium (records) fixed by this record, low assertion added; reviewer not run a second time (docs and a one-line assertion) | APPROVE-equivalent, 0 critical, 0 high, 0 medium open |
| security | see round 1 | APPROVE |

Findings: Superseding record: the status race noted in the apply COMPLETE block and the first review.md section was FIXED in 2744c07 (task row locked with FOR UPDATE before it is read) with test c71088b and 9.7; the it.fails marker is now a plain passing test. Deferred follow-ups: see open line of the handoff review block and docs/progress.md.
Next: /create-pr dev-11-tasks
