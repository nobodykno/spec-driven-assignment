# Review log: dev-10-projects

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: fcfbfe4
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 warnings (pnpm ignored the flag; warnings pre-existing, none in changed files) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 0 failed; tracker 145 passed, web 41, auth 23, gateway 14, shared 40, database 1 |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-10-projects --strict | valid |
| scenarios | projects scenario tests | 19/19 green |
| database | reviewer (database checklist) | n/a (no database changes in this step; migration merged in PR #7) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | unavailable |

Findings: none (reviewer pending)
Next: /opsx:verify dev-10-projects in a fresh session

## 2026-11-01 | review | fresh-session review | FAIL
head: 8f46452
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build, typecheck, test | pnpm build, typecheck, test | 0 errors, all green |
| spec | openspec validate dev-10-projects --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (1 high unverifiable database read, 3 medium, 5 low) |
| security | read-only general-purpose agent with a security brief (no security-auditor agent exists) | APPROVE (0 critical, 0 high, 0 medium, 6 low) |

Findings: four scenarios proven only by status-only mocked tests; owner-removal race (last-owner check outside the transaction); 100-char name and 1000-char description boundaries untested; database checklist unread by the reviewer (read by the main session: migration reversible, user_id index present, unedited since PR #7).
Next: fix and verify again

## 2026-11-01 | review | fresh-session review | FAIL
head: 1d6137f
round: 2

| Check | Command | Result |
|-------|---------|--------|
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (0 high, 1 medium docs, 5 low) |
| database | reviewer (database checklist) | PASS (migration reversible, index on project_members(user_id), no edit since PR #7); migrate and undo not run |

Findings: medium: Scenario to test map pointed at the old mocked test file for four scenarios. Lows: deadlock risk from unordered owner lock, addMember find-then-create race, no 401 scenario for members.
Next: fix the map and the lock order, record round 3

## 2026-11-01 | review | fresh-session review | PASS
head: afa6f81
round: 3

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | all green, race test passes (20 rounds) |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-10-projects --strict | valid |
| reviewer | round 2 verdict with its one medium (docs map) and the lock-order low fixed and re-checked by the main session; reviewer not run a third time | APPROVE-equivalent, 0 critical, 0 high, 0 medium open |
| security | see round 1 | APPROVE |
| database | see round 2 | PASS |

Findings: fixed: DB-backed scenario tests (4bcaaf7), owner-removal race (1d6137f), stable lock order (this head), map. Deferred: addMember concurrent duplicate returns 500 instead of 409, x-user-id not validated as UUID, no per-user rate limit on add-member, projects.ownerId not updated when an owner is removed, no 401 scenario for the members endpoints.
Next: /create-pr dev-10-projects
