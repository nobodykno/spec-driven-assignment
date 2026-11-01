---
name: "OPSX: Verify"
description: "Fresh-session review of the branch against its OpenSpec change: gates + reviewer agent with code-review-graph. Usage - /opsx:verify dev-9-auth"
allowed-tools: Bash(pnpm:*), Bash(pnpm exec openspec:*), Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git rev-parse:*), Bash(git branch:*), Bash(code-review-graph:*), Read, Write, Edit, Glob, Grep, Agent
category: "Workflow"
tags: ["workflow", "verify", "review"]
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow docs/token-policy.md

Change: $ARGUMENTS

Derived from the reference project's `/review`; the assignment names it `/opsx:verify`. Follow `CLAUDE.md` and `docs/CODING_GUIDELINES.md`.

This must run in a FRESH session. If this session already holds implementation work for the change, tell the user to run `/clear` (or open a new Claude Code terminal) and run `/opsx:verify` again, then stop. Do not rely on any summary from the implementing session.

Read `.claude/rules/handoff.md` and `.claude/rules/checkpoint.md` first.

**One review mechanism only:** the `reviewer` agent, with the code-review-graph as an advisory pointer (`docs/graph-tools.md`). No other review agent is run.

1. If no change name was given, infer it from the branch name (for example `feature/auth/DEV-9-auth` -> `dev-9-auth`) and say which one you are using.
2. **Handoff check**: read `openspec/changes/<change>/handoff.md`. The latest `apply` block must be `COMPLETE`; otherwise stop with "Run `/opsx:apply <change>` first" (name the latest block found). Run `git status`: uncommitted changes mean stop and ask the user to commit or stash. Note `git rev-parse --short HEAD`. Read `review.md`: every group has a checkpoint section whose last round is `PASS`, and there is an `apply | final` section. A group with no section, or whose last round is `FAIL`, stops the review with "Run `/opsx:apply <change>` first" and names the group. Also check `git diff main...HEAD -- openspec/changes/<change>/handoff.md openspec/changes/<change>/review.md` shows only added lines (append-only).
3. **Gates**: run `pnpm build`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test --coverage` (at least 80% on the files changed on the branch) and `pnpm exec openspec validate <change> --strict`. Record each result; run every one even if one fails. Test output compact, re-run only failing files (`docs/token-policy.md`).
4. **Traceability**: from the spec scenarios and `tasks.md` map, confirm every scenario has exactly one test titled `FR-XXX-nnn: <scenario name>` and it passes in the run of step 3; list requirements with no test (must be empty); confirm `delta-openapi.yaml` statuses match the scenarios.
5. **Refresh the code graph** (advisory; skip silently if the tool is missing): `code-review-graph update`, then `code-review-graph detect-changes --base main --brief` and keep its risk summary (changed functions, affected flows, test gaps, risk score). It writes only to the git-ignored `.code-review-graph/`. If it fails, note `graph: unavailable` and go on.
6. Delegate to the `reviewer` sub-agent: review `git diff main...HEAD` against `openspec/changes/<change>/`, `docs/FRS.md`, `docs/SDS.md`, `CLAUDE.md` and `docs/CODING_GUIDELINES.md`. Pass it the apply block's `open:` low findings so it can confirm them still hold, the graph risk summary from step 5, and, when the diff touches `packages/database`, the database checklist from `checkpoint.md`. The graph only points to where to look; findings still need code the reviewer read.
7. Print the gate table and the reviewer's table unchanged, then one line: `REVIEW: PASS` only if every gate is green, no requirement lacks a test and the verdict is APPROVE with no critical or high finding open; otherwise `REVIEW: FAIL` with the count of open findings.
8. **Token measurement** (project rule): ask the user to run `/cost` and paste the numbers. Record the ticket's row in `docs/token-efficiency.md` (and `docs/progress.md`): model, tokens/cost, files read (est.), fix rounds, policy violations. Nothing pasted: write "not provided".
9. **Record**: first append a `## <date> | review | fresh-session review | PASS|FAIL` section to `openspec/changes/<change>/review.md` in the format of `.claude/rules/checkpoint.md` (never edit an earlier section): `head`, one table row per gate and one for `reviewer` and `graph` (`used`, `unavailable` or `stale`, with the risk score and test-gap count), and the reviewer's findings table unchanged. Then append `### review | <date> | PASS|FAIL` to `handoff.md` with `head:` the SHA from step 2, `produced:` gates run and the reviewer verdict, `open:` each open finding as one line (severity, file, summary), `next:` `/create-pr <change>` on PASS, otherwise "fix in a normal session, then `/opsx:verify <change>` again". `review.md` and `handoff.md` of the change and `docs/token-efficiency.md` / `docs/progress.md` are the only files this command may edit. The appended lines are committed by the user's reply `commit` (docs commit, `docs(workflow): record review result for <change>`, `Refs: DEV-<n>`); a commit after the review changes HEAD, so the next `/create-pr` compares against the head recorded in the handoff block: commit the review record first, then re-run only if code changed.
10. Do not fix anything from this command. If it fails, tell the user to fix the findings in a normal session and run `/opsx:verify` again. If it passes, the next step is `/create-pr <change>`; any code commit made after this review makes it stale.

Note on step 9 and `head`: the review block's `head` is the code HEAD that was reviewed. A commit that changes only `handoff.md`, `review.md` or `docs/token-efficiency.md` after the PASS does not make the review stale; any other commit does. `/create-pr` checks this with `git diff --name-only <review head>..HEAD`.
