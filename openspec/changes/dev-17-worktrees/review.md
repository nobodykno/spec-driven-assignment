# Review log: dev-17-worktrees

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | group 1: Commands (AC-1) | PASS
head: aa7ac9f
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | all passed (root run 1687, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 90.62% lines |
| spec | openspec validate dev-17-worktrees --strict | valid |
| scenarios | group test tasks | 3/3 green |
| database | n/a | n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 0 medium, 2 low) |
| graph | code-review-graph | used, risk 0.60, 3 helper test gaps (reached through checkCommands) |

Findings: both lows fixed in the 1.4 commit (findings carry the file prefix, normalisePair documented).
Next: group 2

## 2026-11-01 | apply | group 2: Conflicts and contract approval (AC-2, AC-3) | PASS
head: 4c830b8
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | all passed (root run 1693, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 88.57% lines |
| spec | openspec validate dev-17-worktrees --strict | valid |
| scenarios | group test tasks | 6/6 green (9 in the file) |
| database | n/a | n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 0 medium, 2 low) |
| graph | code-review-graph | used at group 1 (risk 0.60), advisory |

Findings: both lows fixed in 2.4 (PREFIX shared at the top of the file; the SHA regex now needs a digit). The no-heading branches of checkConflicts and checkContractApproval have no scenario and no test (accepted).
Next: group 3
