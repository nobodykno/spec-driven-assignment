<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Apply: delegation to sub-agents

`/opsx:apply` delegates tests to `test-writer` and verification to `reviewer`. The main session writes implementation code only. Delegation is real: the Agent tool is called with `subagent_type` set to the agent name, with the brief below. Never describe the work in prose and do it inline instead, unless the agent is unavailable (then say so in the progress output and do it inline). The `implementer` agent is not used by apply: it can run `git commit`, and here only the main session commits, after the human's reply. Agents get only the change, the task numbers and the FRS IDs they need (`docs/token-policy.md`).

## Test tasks -> `test-writer`

Call once per test task (a task that lists scenarios under one test file). Brief, filled in from the task:

```
Change: <change-name>
Layer: <shared | database | auth | tracker | gateway | web | e2e>  (read the layer rules named in layout.md first)
Test file: <repo-relative path, from the task>
Spec: openspec/changes/<change>/specs/<capability>/spec.md, requirement "<title>"
Scenarios (write exactly one test each; title = "<FRS-ID>: <scenario name>", FRS ID taken from the bracket at the end of the scenario name):
  1. <scenario name [FR-XXX-nnn]>
  2. <scenario name [FR-XXX-nnn]>
Contract: openspec/changes/<change>/delta-openapi.yaml (status and error codes), packages/shared (types, schemas)
Helpers to reuse: <names from the layer rules, for example the service test app builder, renderApp>
Run: <exact command, for example pnpm --filter <package> test <file>>
Report: test file path, test titles, command output summary, and why each fails (feature missing, not a typo).
```

Main session, after the agent returns:

1. Read the test file. Check: titles match the format, one test per scenario, real assertions on status codes, bodies and side effects (DB rows, activity entries), no `any`, no snapshot-only or empty assertions, nothing outside test files touched (`git status`).
2. Run the command and confirm every new test fails for the right reason (missing route, missing component, missing function). A test that already passes is a defect: the scenario is either already implemented (note it) or the test is too weak (fix it).
3. If the brief was not followed, send it back to the same agent with SendMessage naming the defect. Do not hand-edit around it more than a trivial fix.
4. Only then mark the test task `[x]` and go to **Commit protocol**. Test-first commits use type `test`: `test(<area>): <n.m> <subject>`. They contain test files only (plus the task's `tasks.md` tick and handoff block).

## Implementation tasks

Implement against the failing tests only, minimal and scoped, following `CLAUDE.md` and `docs/CODING_GUIDELINES.md`. When the named tests are green, go to **Commit protocol**. After the task, the tests it names turn green and nothing else turns red. No test is edited, skipped or weakened to get green; if a test looks wrong, pause and fix it through `test-writer` with a reason. No dependency outside the approved proposal; never edit an applied migration; never read `.env` files.

## Commit protocol (one task, one commit, only after "commit")

After each task, Claude:

1. Stages exactly that task's files with `git add <paths>` (never `git add -A` or `.`), including the `tasks.md` tick and the new `handoff.md` / `review.md` lines for the task.
2. Shows: the staged files (`git diff --cached --stat`), the checks run and their results, and the proposed message.
3. Waits. It runs `git commit` **only after the user replies `commit`**. Any other reply (changes, "ok", "go ahead") is not that reply.
4. Message: conventional commit `type(area): <n.m> subject`, lowercase imperative subject, header at most 72 characters, area from `layout.md` (auth, tracker, gateway, web, shared, database, docker, workflow, docs), footer `Refs: DEV-<n>` (the Jira key). Test-first commits use type `test`. Hooks run on commit; never `--no-verify`; if one fails, fix the cause and show the result again.
5. **Specs and production code never share a commit.** A spec file (`openspec/specs/`, a change's `specs/` or `delta-openapi.yaml`) is committed on its own (Gate 1 commit of the planning artifacts, or a spec fix after `/opsx:update`), before any code that depends on it. If a task's files include both, stop and say so. Tests may go with either.
6. After the commit, verify `git log -1` shows it and the tree is clean before starting the next task.

## Reviewer -> after each task group and at the end

The checkpoint (all steps, in `checkpoint.md`) runs at the end of every group. Its last step calls the `reviewer` sub-agent (fresh context, read-only):

```
Change: <change-name>
Scope: git diff main...HEAD (limit attention to the group just finished: <group title, paths>)
Check against: openspec/changes/<change>/ (proposal, design, tasks, specs, delta-openapi.yaml), docs/FRS.md, docs/SDS.md, CLAUDE.md, docs/CODING_GUIDELINES.md
Graph: <risk summary from `code-review-graph detect-changes --base main --brief`, or "unavailable">
Database checklist: <include only when the group changed packages/database>
Report the findings table and verdict.
```

Handling:

- Verdict `APPROVE` with no critical or high finding: record `reviewer: PASS` on the group's checkpoint line in `tasks.md` and in the group's `review.md` section, continue.
- `CHANGES REQUIRED` (or any critical/high finding): fix critical, high and medium findings in the main session (through `test-writer` for test defects), re-run the whole checkpoint as a new round (a new `review.md` section), call `reviewer` again. Low findings are listed in the final summary. Stop and ask after two failed rounds on the same finding.
- Pending scenarios whose implementation sits in a later group are not defects; say which group in the brief.
- The reviewer runs on the final group in full scope (`git diff main...HEAD`, every scenario). The independent gate is still `/opsx:verify <change>` in a fresh session before `/create-pr`; apply never replaces it.

## Preconditions

Apply stops before the first task when: the Open decision register has an `Open` row, `tasks.md` lacks a test task for a scenario, `delta-openapi.yaml` is missing, the branch is `main`, or the working tree has unrelated changes. It reports which and waits.
