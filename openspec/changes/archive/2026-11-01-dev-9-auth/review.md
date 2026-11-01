# Review log: dev-9-auth

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | final | PASS
head: 9848a2b
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 warnings (pre-existing max-lines-per-function in other files) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 421 passed, 0 failed, 0 skipped |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-9-auth --strict | valid |
| scenarios | scenario to test map | 17/17 green |
| database | reviewer (database checklist) | n/a (no database changes in this record) |
| reviewer | reviewer | pending, run by /opsx:verify |
| graph | code-review-graph | not run |

Findings: none (reviewer pending)
Next: /opsx:verify dev-9-auth in a fresh session

## 2026-11-01 | review | fresh-session review | FAIL
head: 7ad4a84
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build, typecheck, test | pnpm build, typecheck, test | 0 errors, 421 passed |
| spec | openspec validate dev-9-auth --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | CHANGES REQUIRED (4 medium, 4 low) |
| security | read-only general-purpose agent with a security brief (no security-auditor agent exists) | APPROVE (0 critical, 0 high, 3 medium, 9 low) |

Findings: medium: log redaction covered one nesting level; OpenAPI listed statuses with no scenario; duplicate email any letter case not provable in mocked tests; records stale. Security mediums: malformed JSON gives 500, no minimum JWT_SECRET and INTERNAL_TOKEN length, cookie Secure defaults to false outside production.
Next: fix and verify again (round 2)

## 2026-11-01 | review | fresh-session review | PASS
head: e1cd3d4
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 421 passed, 0 failed |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-9-auth --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | APPROVE (0 critical, 0 high, 0 medium, 5 low) |
| security | see round 1 | APPROVE, mediums deferred |
| database | reviewer (database checklist), read of models and migrations | PASS; migrate and undo not run (no Docker in this run), migrations unchanged since PR #6 |
| graph | code-review-graph | unavailable (not run) |

Findings: fixed: redaction now covers two nesting levels (test 8819d92, fix e1cd3d4); OpenAPI extras moved to x-unspecified-statuses. Known gap: FR-AUTH-001 any letter case duplicate relies on the CITEXT column, no database-backed test. Deferred follow-ups (docs/progress.md): malformed JSON 400, secret minimum length, cookie Secure default, gateway and tracker logger redaction depth, bcrypt 72-byte cap, UUID check on X-User-Id, seeder production guard.
Next: /create-pr dev-9-auth
