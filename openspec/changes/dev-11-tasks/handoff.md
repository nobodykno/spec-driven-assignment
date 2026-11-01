# Handoff: dev-11-tasks

Append only. See .claude/rules/handoff.md.

### propose | 2026-10-30 | AWAITING_GATE_1
head: 311a54e
produced: retroactive (merged in PR #8 before the opsx workflow); proposal.md, design.md, tasks.md, specs/tasks/spec.md
checks: n/a
open: none
next: /opsx:apply dev-11-tasks

### gate-1 | 2026-11-01 | APPROVED
head: 311a54e
produced: retroactive (merged in PR #8 before the opsx workflow); user approved the retroactive gate in chat on 2026-11-01, original approval recorded in proposal.md (2026-10-30 18:29 IST)
checks: n/a
open: none
next: /opsx:apply dev-11-tasks

### apply | 2026-11-01 | COMPLETE
head: 311a54e
produced: retroactive (merged in PR #8 before the opsx workflow); 8/8 tasks ticked, 16/16 scenarios have a passing test titled FR-XXX-nnn: <scenario name>, delta-openapi.yaml, Scenario to test map
checks: PASS, see review.md "2026-11-01 | apply | final"
open: known defect, status changes have no row lock (concurrent identical transitions both succeed); pinned by an it.fails test, fix is out of scope here
next: /opsx:verify dev-11-tasks

### review | 2026-11-01 | PASS
head: ea041f1
produced: gates green (build, typecheck, tests, validate --strict, lint 0 errors); isolated subagent review (Rule 23): reviewer round 1 CHANGES REQUIRED (stale records, fixed by this superseding record), security audit APPROVE; see review.md latest review section
checks: PASS, coverage waived by the user
open: deferred: assign and create race with member removal and project archive (task writes read membership and project status without a lock), create() checks outside the transaction, x-user-id not UUID-checked, update activity stores full descriptions, dueFrom later than dueTo accepted
next: /create-pr dev-11-tasks
