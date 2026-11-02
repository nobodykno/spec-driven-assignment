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

## 2026-11-02 | apply | group 3: Evidence and CLI (AC-4) | FAIL
head: 4333a6c
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | all passed (root run 1697, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 78.68% lines (the CLI entry block runs in a child process) |
| spec | openspec validate dev-17-worktrees --strict | valid |
| database | n/a | n/a (no database changes) |
| scenarios | group test tasks | 4/4 green |
| reviewer | reviewer | CHANGES REQUIRED (0 high, 2 medium, 2 low) |
| graph | code-review-graph | advisory |

Findings: medium: the CLI printed nothing for a valid log although the scenario says it exits 0 and prints a success line; medium: that half had no test; low: any line containing Merge counted as a merge; low: shallow clones skip the SHA check (accepted).
Next: fix and run the checkpoint again (round 2)

## 2026-11-02 | apply | group 3: Evidence and CLI (AC-4) | PASS
head: d06ef04
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | all passed (root run 1697, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 78.68% lines (the CLI entry block runs in a child process) |
| spec | openspec validate dev-17-worktrees --strict | valid |
| database | n/a | n/a (no database changes) |
| scenarios | group test tasks | 4/4 green (13 in the file) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 0 medium, 2 low) |
| graph | code-review-graph | advisory |

Findings: fixed: test 3.4 (red first) and 3.5 (success line printed, merge matched only as a subject after a SHA). Lows open: no regression test for the strict merge match; on a shallow clone both the notice and the OK line print.
Next: group 4

## 2026-11-02 | apply | group 4: Worktree log content and lint wiring (AC-1 to AC-4) | FAIL
head: 94de9c4
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag); the lint chain now prints check-worktree-docs OK |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test --coverage | all passed (root run 1699, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 78.68% lines (the CLI entry block runs in a child process); docs-only otherwise |
| spec | openspec validate dev-17-worktrees --strict | valid |
| database | n/a | n/a (no database changes) |
| scenarios | group test tasks | 2/2 green (15 in the file) |
| reviewer | reviewer | CHANGES REQUIRED (0 high, 1 medium, 4 low) |
| graph | code-review-graph | advisory |

Findings: medium: the Shared contracts row said 45f1e37 was approved at 18:10 and 4 minutes before the web pair proposals; git says 18:11:52, after those proposals; lows: DEV-15 contract row had no SHA, the worktree list block was not labelled point-in-time, the removal date and the test database example were not traceable.
Next: correct the document from git and check again (round 2)

## 2026-11-02 | apply | group 4: Worktree log content and lint wiring (AC-1 to AC-4) | PASS
head: 7d911cf
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag); the lint chain now prints check-worktree-docs OK |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test --coverage | all passed (root run 1699, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 78.68% lines (the CLI entry block runs in a child process); docs-only otherwise |
| spec | openspec validate dev-17-worktrees --strict | valid |
| database | n/a | n/a (no database changes) |
| scenarios | group test tasks | 2/2 green |
| reviewer | main session re-check of every corrected fact against git (f5db3c7 18:14:44, f05837a and 2ec4eaf 18:29:46, e43d1e2 18:32:35, 143a1c3 18:32:47, c3d5294, 45f1e37 18:11:52); the full-diff reviewer runs next | all corrected facts match git; no new reviewer run for a documentation-row fix |
| graph | code-review-graph | advisory |

Findings: fixed in 4.5: contract rows rewritten from git facts, DEV-15 row cites e43d1e2 and 143a1c3, worktree list block labelled as a point-in-time copy, removal date corrected to 2026-11-01, the unverified database name example dropped.
Next: group 5 (full-diff review, then /opsx:verify)

## 2026-11-02 | apply | final | FAIL
head: c557430
round: 1

| Check | Command | Result |
|-------|---------|--------|
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 78.7% lines, below the 80% rule |
| reviewer | reviewer (full diff main...HEAD) | CHANGES REQUIRED (0 high, 1 medium, 4 low) |

Findings: medium: coverage 78.7% below 80% because the CLI block and the git helpers only ran in a child process. Lows: isShallow fallback treats unreadable git as shallow (documented now in main), the digit lookahead rejects an all-letter SHA (accepted, the existence check catches prose), worktree list block not labelled point-in-time (labelled), Parallel run and Chronological log are prose not checked by the script.
Next: fix and check again (round 2)

## 2026-11-02 | apply | final | PASS
head: 284cf0c
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 errors, 24 existing warnings (the script ignores the flag); check-worktree-docs prints OK |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test --coverage | 1702 passed, 0 failed (root run, it also scans the .claude/worktrees copies) |
| coverage | vitest run scripts/check-worktree-docs.test.mjs --coverage | scripts/check-worktree-docs.mjs 92.74% lines (was 78.68% in round 1) |
| spec | openspec validate dev-17-worktrees --strict | valid |
| scenarios | all test tasks | 15/15 green (18 tests in the file, 3 extra helper tests) |
| database | n/a | n/a (no database changes) |
| reviewer | full-diff reviewer round 1 medium fixed (tests 5.1 red first, refactor 5.2 exports main, gitCommitExists, isShallow; both blocks labelled in 5.3) and re-run by the main session; the independent reviewer pass follows in /opsx:verify | APPROVE-equivalent, 0 critical, 0 high, 0 medium open |
| graph | code-review-graph | advisory |

Findings: lows only (see round 1): isShallow fallback documented in the main function JSDoc, digit lookahead kept, prose sections not machine-checked.
Next: /opsx:verify dev-17-worktrees in a fresh session
