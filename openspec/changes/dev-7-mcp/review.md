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

## 2026-11-01 | apply | group 3: Evidence log | FAIL
head: 9557ba8
round: 1

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | FAIL: check-claude-settings, 2 malformed permission rules (mcp__context7__resolve-library-id, mcp__context7__query-docs) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 437 passed, 1 failed (NFR-MNT-001: current settings pass), 0 skipped |
| coverage | pnpm test --coverage | unavailable (@vitest/coverage-v8 not installed; not in the approved proposal) |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | group test tasks | 20/20 green in scripts/check-mcp-docs.test.mjs |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer | CHANGES REQUIRED (0 critical, 1 high, 1 medium, 3 low) |
| graph | code-review-graph | used: low risk, untested readIfExists and run |

Findings:

| Severity | File:line | Issue |
|---|---|---|
| high | .claude/settings.json:21-22, scripts/check-claude-settings.mjs:8 | RULE name class has no hyphen, so the hyphenated Context7 allow rules are rejected; lint and NFR-MNT-001 red |
| medium | package.json, scripts/check-mcp-docs.mjs | coverage provider not installed, step 5 cannot run |
| low | scripts/check-mcp-docs.mjs:224,228 | readIfExists and run have no direct tests |
| low | docs/mcp-setup.md (Context7 lookups) | Sequelize row says "6.x docs"; recorded version not clearly the one the lookup answered for |
| low | diff stat | hooks/agent-scope-guard, frs-ticket, archive and openspec/config.yaml changes sit outside group 3; confirm a task covers each |

Next: /opsx:update added tasks 3.5 and 3.6 (design D6, spec commit 241241b); fix the high finding test-first, then run checkpoint 3 again as round 2 (task 3.7). The medium finding waits for the user's decision (waive or add the dependency).

## 2026-11-01 | apply | group 3: Evidence log | PASS
head: c8d6c33
round: 2

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | exit 0, 24 existing warnings (the lint script does not pass the flag to ESLint); check:claude-settings and check:mcp-docs pass |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 440 passed, 0 failed, 0 skipped |
| coverage | pnpm test --coverage | waived by the user (no coverage provider installed; not in the approved proposal), same as groups 1 and 2 |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | group test tasks | 46/46 green in scripts/check-mcp-docs.test.mjs and scripts/check-claude-settings.test.mjs (incl. the 2 new DEV-1004-AC-1 scenarios) |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 1 medium, 5 low) |
| graph | code-review-graph | used: risk 0.60, 0 affected flows, untested readIfExists and run |

Findings:

| Severity | File | Issue |
|---|---|---|
| medium | .claude/hooks/agent-scope-guard.mjs and its test | guard change (isApprovedHandoff, branch format, refusal text) from group 1 commits 3f55330 and 65d0dac is not in proposal, design or tasks; record it at the next /opsx:update or in the PR description and confirm at Gate 2 |
| low | .claude/commands/frs-ticket.md, archive.md | required phrases from the "Jira commands state every failure case" scenario; in scope |
| low | openspec/config.yaml:29 | wording-only YAML fix (81968c3), recorded in the propose handoff |
| low | scripts/check-claude-settings.mjs:9 | `mcp__` plus a lone hyphen would also pass; harmless |
| low | docs/mcp-setup.md | Sequelize row cites 6.37.8 while the unmatched id was v6.37.7; optional wording clarification |
| low | scripts/check-mcp-docs.mjs | readIfExists and run untested; coverage unmeasured (step 5 waived) |

Next: commit task 3.7, then group 4 (task 4.1, full-diff run and /opsx:verify in a fresh session). The medium finding is left open for the user's decision.

## 2026-11-01 | apply | final | PASS
head: ecb41f9

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | exit 0, 24 existing warnings; check:claude-settings and check:mcp-docs pass |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 440 passed, 0 failed, 0 skipped |
| coverage | pnpm test --coverage | waived by the user (no coverage provider installed) |
| spec | openspec validate dev-7-mcp --strict | valid |
| scenarios | full diff, every scenario | 19/19 have exactly one test titled DEV-1004-AC-n (17 in scripts/check-mcp-docs.test.mjs, 2 in scripts/check-claude-settings.test.mjs) |
| database | reviewer (database checklist) | n/a (no database changes) |
| reviewer | reviewer (git diff main...HEAD) | APPROVE (0 critical, 0 high, 2 medium, 7 low) |
| graph | code-review-graph | used: risk 0.60, 0 affected flows, untested readIfExists and run |

Findings:

| Severity | File | Issue |
|---|---|---|
| medium | .claude/hooks/agent-scope-guard.mjs and its test | group 1 guard change (branch format, isApprovedHandoff, refusal text) is not in proposal, design or tasks; name it in the PR description for Gate 2 or record it with /opsx:update |
| medium | .claude/hooks/agent-scope-guard.mjs:266-285 | the guard now trusts gate-1 APPROVED in handoff.md, which agent sessions append to; handoff rule 1 forbids it but nothing enforces it; the human accepts the trade-off at Gate 2 |
| low | scripts/check-mcp-docs.test.mjs | real-repo assertions filter findings by regex before asserting empty; assert on the unfiltered list |
| low | scripts/check-mcp-docs.test.mjs:59-97 | three [design] tests lack an AC ID in the title and were not seen failing first (already recorded for group 1) |
| low | scripts/check-mcp-docs.mjs | readIfExists and run untested; coverage unmeasured (waived) |
| low | scripts/check-claude-settings.mjs:9 | pattern accepts mcp__- and similar names; harmless |
| low | review.md, handoff.md | group 1 rounds 1 and 2 share head bc6b8fa; confirm append-only in /opsx:verify |
| low | frs-ticket.md, archive.md, openspec/config.yaml | small wording changes; in scope or wording only |
| low | tasks.md, review.md | 4.1 and the final section were pending at review time (done by this entry) |

Next: commit task 4.1, then /opsx:verify dev-7-mcp in a FRESH session; the PR description must name the guard change for Gate 2.

## 2026-11-01 | review | fresh-session review | PASS
head: 6424eee
round: 2 (round 1 at b84c885 was CHANGES REQUIRED: 2 mediums; docs fixed in 6424eee)

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint | 0 errors, 24 existing warnings (the lint script ignores --max-warnings) |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 440 passed, 0 failed |
| coverage | pnpm test --coverage | waived by the user (no provider installed) |
| spec | openspec validate dev-7-mcp --strict | valid |
| reviewer | reviewer (isolated subagent review, Rule 23) | APPROVE (0 critical, 0 high, 1 medium process, 2 low) |
| security | read-only general-purpose agent with a security brief (no security-auditor agent exists) | APPROVE (0 critical, 0 high, 1 medium, 4 low) |
| database | n/a (no database changes) | n/a |
| graph | code-review-graph | used, risk 0.60, 10 test gaps |

Findings: open medium (process): agent-scope-guard change is outside the proposal and the guard trusts gate-1 in handoff.md; disclosed in the PR description for the human at Gate 2. Security medium: npx -y context7 residual risk, now documented in docs/mcp-setup.md. Lows: readIfExists and run untested, filtered real-repo assertions, secret scan heuristics, handoff regex ignores code fences, proposal.md approval fallback.
Next: /create-pr dev-7-mcp
