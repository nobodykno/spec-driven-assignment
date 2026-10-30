# Verification: DEV-6 Autonomous agents (`dev-6-agents`)

- **Ticket:** DEV-6 (assignment ID DEV-1003), source: live MCP (Jira `paramjitjena6.atlassian.net`)
- **Approval:** Paramjit Jena, via chat, 2026-10-30 16:10 IST; re-approved after the
  token-policy `/opsx:update` 2026-10-30 16:33 IST
- **Verified:** 2026-10-30 on `feature/DEV-6-agents`, fast mode (one reviewer round; medium/low
  findings accepted as non-blocking, at the user's request)
- **Tasks:** 15/16 complete (6.2 `/cost` row is recorded at checkpoint B);
  `openspec validate dev-6-agents --strict` passes

## Quality gates

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` (versions, file names, Claude settings, **agents**, ESLint, Prettier) | pass: 0 errors, 7 `no-console` warnings in the services' `error-handler.ts` (unchanged since DEV-1) |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 366 root tests + 55 package tests (before the review fix); after the fix (099844b) `vitest run .claude/hooks/` 231 pass, ESLint clean |
| `node scripts/check-agents.mjs`, `node scripts/check-claude-settings.mjs` | pass |

## Traceability

Tests are named with the requirement ID. "Live" = delegated to the real subagent in this
session (`docs/agents.md` → Checks).

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-MNT-001 | Agents are listed | Live check 1 (all four agent types loaded after session restart); `/agents` menu confirmed by the human at checkpoint B | pass (human confirmation pending) |
| NFR-MNT-001 | Valid definitions pass the checker | `scripts/check-agents.test.mjs` : NFR-MNT-001: valid definitions pass the checker (fixture set, committed files) | pass |
| NFR-MNT-001 | Broken definition fails the checker | `check-agents.test.mjs` : NFR-MNT-001: broken definition fails the checker (9 cases) | pass |
| NFR-MNT-001 | Edits allowed on an approved change | `.claude/hooks/agent-scope-guard.test.mjs` : NFR-MNT-001: implementer edits allowed on an approved change | pass |
| NFR-MNT-001 | Edits blocked on an unapproved change | `agent-scope-guard.test.mjs` : NFR-MNT-001: implementer edits blocked on an unapproved change; live check 4 | pass |
| NFR-MNT-001 | Push and Jira writes blocked | `agent-scope-guard.test.mjs` : NFR-MNT-001: implementer push blocked (16 forms) / Jira writes blocked (4 tools) | pass |
| NFR-TST-001 | Test file edit allowed | `agent-scope-guard.test.mjs` : NFR-TST-001: test-writer test file edit allowed | pass |
| NFR-TST-001 | Production code change refused | `agent-scope-guard.test.mjs` : NFR-TST-001: test-writer production code change blocked / shell writes blocked; CLI test (exit 2); live check 2 (refusal) | pass |
| NFR-TST-001 | Reviewer reports without editing | `agent-scope-guard.test.mjs` : NFR-TST-001: reviewer reports without editing / runs no other commands; live check 3 (`git status` empty) | pass |
| NFR-TST-001 | Summary alone is not trusted | Live check 3: given only a summary, the reviewer cited `file:line` from the diff | pass |
| NFR-MNT-001 | Status file update allowed | `agent-scope-guard.test.mjs` : NFR-MNT-001: coordinator status file update allowed | pass |
| NFR-MNT-001 | Code change blocked (coordinator) | `agent-scope-guard.test.mjs` : NFR-MNT-001: coordinator code change blocked / runs no changing commands; live check 5 | pass |
| NFR-MNT-001 | Known agent and valid input are evaluated | `agent-scope-guard.test.mjs` : NFR-MNT-001: known agent and valid input evaluated | pass |
| NFR-MNT-001 | Malformed input blocked | `agent-scope-guard.test.mjs` : NFR-MNT-001: malformed input and unknown agent blocked; CLI fails closed | pass |
| NFR-MNT-001 | Documentation complete | `check-agents.mjs` on the committed `docs/agents.md` (five headings per agent) | pass |
| NFR-MNT-001 | Documentation out of date fails the checker | `check-agents.test.mjs` : NFR-MNT-001: documentation out of date fails the checker (4 cases) | pass |
| NFR-MNT-001 | Policy referenced everywhere | `check-agents.test.mjs` : NFR-MNT-001: policy referenced everywhere; committed-files run | pass |
| NFR-MNT-001 | Missing policy reference fails the checker | `check-agents.test.mjs` : NFR-MNT-001: missing policy reference fails the checker (5 cases) | pass |
| NFR-MNT-001 | Build output and lock files are not read | Live check 6 (Read of `pnpm-lock.yaml` denied); `check-claude-settings.mjs` passes | pass |
| NFR-MNT-001 | Reviewer checks policy compliance | `reviewer.md` checklist item 10; round-1 review assessed it (finding on missing progress data) | pass |
| NFR-MNT-001 | Token use recorded per ticket | Task 6.2 at checkpoint B (`docs/progress.md`, `docs/token-efficiency.md`) | at checkpoint B |
| NFR-MNT-001 | Measurement missing | Same step: "not provided" if no `/cost` paste | at checkpoint B |

## Requirements with no test

None without evidence. Live-only scenarios (agents listed, refusal, summary not trusted, policy
review, measurement) are covered by live checks or by the checkpoint-B step, not by automated
tests; that is inherent to agent behaviour.

## Reviewer findings (round 1 of 1, fast mode)

Verdict round 1: CHANGES REQUIRED. No re-review: the fix touched the agent guard, not app
auth/access-control code.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| high | `.claude/hooks/agent-scope-guard.mjs:91` | Push check bypassed by `git -C <path> push`, `git -c k=v push`, `command git push`, `/usr/bin/git push` | **fixed** 099844b: git global options skipped, git/gh matched anywhere in a command by basename; 8 regression tests |
| medium | `agent-scope-guard.mjs:52` | `git diff --output=<file>` lets read-only agents write files | **fixed** 099844b: any `--output*` word rejected; test added |
| medium | `.claude/agents/coordinator.md:4` | `docs/worktrees.md` missing, coordinator has only Edit | **fixed** 099844b: `docs/worktrees.md` created with the log table |
| medium | `tasks.md:52,57,58` | Live checks, gates, `/cost` row not done at review time | **fixed**: checks 1–6 recorded in `docs/agents.md`, gates run; `/cost` row at checkpoint B |
| low | `agent-scope-guard.mjs:71` vs `reviewer.md:4` | Guard allows `git show`/`git status` for the reviewer, frontmatter lists only `git diff`/`git log`; `git -C <path> diff` blocked | accepted, non-blocking: `docs/agents.md` documents the extra read-only commands; agents run git from the project root |
| low | `agent-scope-guard.mjs:105` | On an unapproved change the implementer's Bash can still write files (`sed -i`) | accepted, non-blocking: the spec names Edit/Write; prompt + global guard + approval gate in `/sdd:apply` cover it |
| low | commit 057b344 | Token-efficiency commit made outside the first approved scope | accepted: requested by the user, disclosed, approved in the re-plan |
| low | `docs/progress.md` | No apply rows / measurement fields after re-approval | fixed at checkpoint B (rows added with the measurement) |

## Deviations from the spec or SDS

- **Design refinement (task 1.1):** `Bash(...)` specifiers in subagent `tools` are not documented as
  restricting Bash, so the guard is an allowlist and the reviewer gets the guard too.
- **Scope added mid-apply:** token-efficiency policy (user request), re-approved 16:33 IST.
- **Live checks 2, 4, 5:** the agents refused the forced-violation steps on policy, so the hook
  blocks for push and production-code edits are shown by unit/CLI tests rather than live calls.
- **SDS:** unchanged.

## Result

**READY FOR PR**, once the user confirms `/agents` and provides `/cost` at checkpoint B.
