---
name: "OPSX: Apply"
description: "Implement tasks from an OpenSpec change (tests via test-writer, group checks via reviewer, commit after your reply)"
allowed-tools: Bash(pnpm exec openspec:*), Bash(pnpm:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git add:*), Bash(git commit:*), Bash(code-review-graph:*), Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
category: "Workflow"
tags: ["workflow", "artifacts", "experimental"]
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow docs/token-policy.md

Implement tasks from an OpenSpec change. Tests are written by the `test-writer` sub-agent, implementation by this session, each task group is checked by the `reviewer` sub-agent. Follow `CLAUDE.md` and `docs/CODING_GUIDELINES.md`.

**Read before step 1:** `.claude/rules/handoff.md` (stage log), `.claude/rules/checkpoint.md` (group checkpoint and `review.md`), `.claude/rules/apply-delegation.md` (briefs, commit protocol, preconditions) and `.claude/rules/layout.md`. Read the layer rules of each layer a task touches.

**Input**: optional change name (`/opsx:apply dev-9-auth`). Else infer from the conversation or branch, auto-select if one active change exists, else list with `pnpm exec openspec list --json` and ask. Announce "Using change: <name>".

**Steps**

1. **Check OpenSpec root**: `pnpm exec openspec list --json`; `"root": null` means stop and tell the user (never run `openspec init` or create `openspec/` yourself).
2. **Status**: `pnpm exec openspec status --change "<name>" --json` (schema, `changeRoot`, tasks artifact).
3. **Handoff and Gate 1** (`handoff.md`). Read `<changeRoot>/handoff.md`.
   - No `propose` block: stop, "Run `/opsx:propose <name>` first".
   - Latest `propose`/`update` block is `BLOCKED_OPEN_DECISIONS`: stop and list its `open:` rows.
   - Latest `gate-1` is `APPROVED` and newer than the last `propose`/`update`: continue. If the last `apply` block is `IN_PROGRESS` or `PAUSED`, this is a resume: the first pending task in `tasks.md` is the start, and its `head` must be an ancestor of HEAD (else stop and report).
   - Otherwise (no `gate-1`, or a newer `update`): show the Proposed summary (artifacts, scenario count, `Assumed` rows) and ask with AskUserQuestion "Approve the spec for <name>?" (Approve / Revise with /opsx:update). Approve: append `### gate-1 | <date> | APPROVED` (`produced: approved by user in session`). Revise: append `REJECTED` and stop.
   - Never infer approval from the request wording. Never write code for a change without `gate-1 APPROVED`.
   - The planning artifacts (specs, `delta-openapi.yaml`, handoff) are committed on their own first, as `docs(workflow): propose <name>` with `Refs: DEV-<n>`, through the commit protocol; no production code starts until that commit exists.
4. **Preconditions** (`apply-delegation.md`; stop and report if any fails): no `Open` row in the proposal's Open decisions table; `delta-openapi.yaml` exists; every scenario is in exactly one test task; `git status` shows no unrelated changes; on the feature branch `feature/{domain}/DEV-<n>-<short-name>`, not `main`.
5. **Plan the work.** For a change with several task groups or a `[PARALLEL]` task, ask the `coordinator` agent for the task order and worktree plan first and run the commands it plans yourself.
6. **Instructions**: `pnpm exec openspec instructions apply --change "<name>" --json`. `state: "blocked"` -> show the message, complete `missingArtifacts` via `openspec instructions <id>`, do not implement. `state: "all_done"` -> report and suggest `/opsx:verify`. Treat `context` and `operationGuidance` as constraints; never copy them into files or count them as proof of completion.
7. **Read every file in `contextFiles`**, then show progress: schema, "N/M tasks complete", remaining tasks.
8. **Loop over pending tasks** (show "Working on task N/M: ..."):
   - **Test task** -> `Agent` with `subagent_type: "test-writer"` and the brief from `apply-delegation.md`. Then read the test file: titles are `FR-XXX-nnn: <scenario name>`, one test per scenario, real assertions, nothing outside test files touched; run it and confirm each test fails for the right reason. Defects go back via SendMessage. If the agent is unavailable, write the tests directly and say so.
   - **Implementation task** -> minimal code that turns the named failing tests green. Verify library APIs you are unsure of with Context7 and note them in `design.md` "Docs checked". Never edit, skip or weaken a test to get green. No dependency outside the approved proposal.
   - **Checkpoint task** (end of every group, database groups included) -> run the full checkpoint in `.claude/rules/checkpoint.md`: build, lint, typecheck, test, coverage on the files changed in the group, `openspec validate --strict`, the group's scenario tests, the database check (`reviewer` with the database checklist) when the group changed `packages/database`, then refresh the code graph (`code-review-graph update`, advisory: skip if it fails) and run the `reviewer` (`Agent`, brief in `apply-delegation.md`). Run every step even if one fails. **Any red test, failed check or `CHANGES REQUIRED` fails the checkpoint.** Append a section to `<changeRoot>/review.md` after every round, PASS or FAIL, in the format of `checkpoint.md`; never edit an earlier section. PASS: note `reviewer: PASS` on the checkpoint line in `tasks.md` and append `### apply | <date> | IN_PROGRESS` to `handoff.md` (`produced:` group title and tasks done N/M, `head`, `checks:` PASS plus the `review.md` heading, `open:` low findings, `next:` the next task). FAIL: fix critical, high and medium findings and every red check (tests only through `test-writer`), then run the whole checkpoint again as the next round; ask after two failed rounds on one finding. Do not start the next group on a FAIL.
   - Before editing a checkbox confirm `sourcePath` and `line` still match the task; mark `- [x]` only when the specified behaviour is fully done; rerun the apply instructions to confirm progress.
   - **Commit protocol** (`apply-delegation.md`): when a task is done (checkbox `[x]`, its checks run), stage only that task's files, then report `## Task N/M done - waiting for your "commit"` with the staged files, the checks and their results, and the proposed message (`type(area): <n.m> subject`, footer `Refs: DEV-<n>`; test-first tasks use type `test`). **Run `git commit` only after the user replies `commit`.** Append the `apply | IN_PROGRESS` handoff block before staging so the commit includes it. Specs and production code never share a commit: if the task's files include both, stop and say so. Never `--no-verify`; if a hook fails, fix the cause and show the result again.
   - **Never edit a spec, `delta-openapi.yaml` or the scenarios to fit the code.** If a scenario looks wrong, pause (step 9) and suggest `/opsx:update`; the spec fix is its own commit, before any code that depends on it.
   - **Resume** after the commit: verify `git log -1` shows the new commit and `git status` is clean (apart from untracked files that existed before). If not, say what is missing and wait. Do not start the next task before this check passes.
9. **Pause** (report, give options, wait) on: unclear task; design issue (suggest `/opsx:update`); work beyond the spec or temptation to drop, narrow or defer specified behaviour; a new unresolved behaviour question (add it as `Open` to the register, ask, resume after the answer); a dependency not in the proposal; any error or blocker. On every pause append `### apply | <date> | PAUSED` with the reason in `open:` and `next:`.
10. **Complete**: when all tasks are `[x]`, run the reviewer on the full diff (`git diff main...HEAD`, every scenario), append an `apply | final` section to `review.md`, then append `### apply | <date> | COMPLETE` to `handoff.md` (`head`, `produced:` commit range `main..HEAD` and "M/M tasks, S/S scenarios have a passing test", `checks:` final build/lint/typecheck/test, `open:` low findings, `next: /opsx:verify <name>` in a fresh session) and commit them through the commit protocol.

**Output**

During: `## Implementing: <change> (schema: <schema>)`, then per task `Working on task N/M: ...` and `✓ Task complete`.

On completion:

```
## Implementation Complete
**Change:** <name>  **Progress:** M/M tasks complete

### Scenario coverage
| Capability | Scenario | Test file | Test | Result |   (one row per scenario, from the last pnpm test)

### Delegation
- test-writer: <n> calls, <n> sent back
- reviewer: <group> PASS/FAIL (<n> findings, <n> open); final full-diff run PASS/FAIL
- Low findings left open: <list or none>

### Checkpoints (from review.md)
| Group | Rounds | Result | build | lint | typecheck | test | coverage (lowest) | spec | database | reviewer |

Next, in a FRESH session: `/opsx:verify <name>`, then `/create-pr <name>`. Sync and archive only after the merge.
```

On pause: `## Implementation Paused`, change, progress N/M, the issue, numbered options, "What would you like to do?".

**Guardrails**
- Never write code before `gate-1 APPROVED` is in `handoff.md`; never edit or delete earlier handoff blocks.
- Never commit without the user's reply `commit`; never push; never write to Jira (apply has no Jira step).
- Keep going until done or blocked; keep changes minimal and scoped to each task; update the checkbox immediately.
- Do not guess on errors or ambiguity; never silently narrow, defer or simplify specified behaviour.
- Test tasks go to `test-writer`, group checks to `reviewer`; do not hand-write scenario tests while the agent is available.
- Never mark a group done without its `review.md` section; never rewrite or delete an earlier section.
- Apply does not replace `/opsx:verify`: the reviewer pass in a checkpoint does not clear Gate 2.
- Never edit an applied migration; never read `.env` files; use pnpm only.
- Preserve CLI-controlled blocked/ready/all-done behaviour. Can be invoked at any time and may suggest artifact updates.
