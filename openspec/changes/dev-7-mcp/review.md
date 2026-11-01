# Review log: dev-7-mcp

Append only. See .claude/rules/checkpoint.md.

## 2026-11-01 | apply | group 1: Config and secrets | FAIL
head: bc6b8fa
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 warnings (existing, services code; `--max-warnings 0` is not forwarded to eslint by the lint chain) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 425 passed incl. 4 new, 0 failed |
| coverage | pnpm test --coverage | unavailable: @vitest/coverage-v8 is not installed (existing gap, no new dependency allowed in this change) |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | group test tasks | 4/4 green |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer | CHANGES REQUIRED (1 high, 3 medium, 5 low) |
| graph | code-review-graph | used: risk 0.55, 0 affected flows, 2 test gaps (guard hook helpers, reached via readApproval) |

Findings: high .mcp.json:10 pinned version 4.4.4 unverified (evidence: `pnpm view @upstash/context7-mcp` returned latest 4.4.4, published 2026-10-19T13:48Z, bin context7-mcp); medium non-object server entry throws; medium startsWith matches look-alike package; medium real-config pin not tested; low secret flags and CLI wiring and forgery note and test ID and config wording.
Next: fix high and medium findings, run round 2.

## 2026-11-01 | apply | group 1: Config and secrets | PASS
head: bc6b8fa
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 warnings (existing) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 425 passed, 0 failed |
| coverage | pnpm test --coverage | unavailable (see round 1) |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | group test tasks | 4/4 green, plus 3 [design] tests |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 0 medium, 4 low) |
| graph | code-review-graph | used (round 1 summary) |

Findings: low `--flag=value` form of secret flags not matched; low `--token --foo` false positive; low redundant real-file filter in the AC-6 test; low CLI exit path not tested (planned for group 2). Note: the three [design] tests were written while the fix was applied, so they were not seen failing first.
Next: commit tasks 1.1 (extra tests) and 1.2, then group 2.

## 2026-11-01 | apply | group 2: Approval and command checks | PASS
head: 71b0501
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 warnings (existing); check:mcp-docs runs in the chain |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 430 passed, 0 failed |
| coverage | pnpm test --coverage | unavailable (no coverage provider installed, see group 1) |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | group test tasks | 5/5 green (12/12 in the file) |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 0 medium, 5 low) |
| graph | code-review-graph | used: risk 0.60, 0 affected flows, 7 test gaps (via callers) |

Findings: low failure-rule check is word-level (never invent, stop), not per case; low approval check is loose; low ask/allow not guarded as arrays (fixed after review); low task 2.2 allow-list step for Context7 tools carried to 3.3; low missing JSDoc on readIfExists and run (fixed after review). Reviewer could not run git; it read the working tree.
Next: commit task 2.2, then group 3.
