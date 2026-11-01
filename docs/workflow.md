<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Workflow: ticket to archived change

Every ticket goes through the same loop, run with six `/opsx:*` commands plus `/opsx:verify`, and three
top-level commands (`/create-pr`, `/frs-ticket`, `/save-context`). The commands are short; their rules live in
`.claude/rules/` (six files). Two append-only logs per change carry the state: `handoff.md` (stage machine) and
`review.md` (checkpoint evidence). This design is taken from the reference project (see "Reference files used")
and adapted to this project (see "Adaptations and reasons").

## Lifecycle

```text
 Jira ticket (live via Atlassian MCP)
   |  /opsx:explore   fetch ticket, read code/specs, list open questions            (optional, handoff: explore)
   |  /opsx:propose   fetch ticket, blockers Done, proposal + specs + design + tasks + delta-openapi.yaml
   |                  open-decision gate; Jira -> In Progress (with approval)       handoff: AWAITING_GATE_1
   v
 GATE 1  human approves the spec (AskUserQuestion in /opsx:apply)   <-- /opsx:update reopens it
   |  /opsx:apply     test-writer: failing test per scenario; main session implements;
   |                  checkpoint after EVERY task group; one commit per task, after the reply `commit`
   v
   |  /opsx:verify    FRESH session: gates + traceability + reviewer agent (code-review-graph)   handoff: PASS|FAIL
   |  /create-pr      only if the review PASS head equals HEAD; Jira -> In Review + PR link (with approval)
   v
 GATE 2  human reviews the code against the spec and merges
   |  (follow-up branch feature/docs/DEV-<n>-archive-<name> from main)
   |  /opsx:sync      merge delta specs into openspec/specs/
   |  /opsx:archive   move the change to openspec/changes/archive/; Jira -> Done (with approval)
   v
 small follow-up PR (never a push to main)
```

## Command reference

### /opsx:explore

`/opsx:explore DEV-<n>` fetches the Jira ticket first (stops on any MCP failure, never invents ticket data), checks
that blockers are Done, reads the FRS/SDS sections it needs, and thinks through the problem with the user. It writes
nothing unless the user confirms a capture; it ends with open questions in the shape of the Open decisions table.

### /opsx:propose

`/opsx:propose DEV-<n> <name>` fetches the ticket, checks blockers, grounds itself in FRS (sections 1.3, 3, 4, 5, 6) and
SDS (2, 3, 5 to 11, 13, 14), creates `openspec/changes/dev-<n>-<name>/` and writes `proposal.md` (with the Open decisions
table) first. Open rows are asked with AskUserQuestion before anything else is written. Then specs, `design.md`,
`tasks.md` (with the Scenario to test map) and `delta-openapi.yaml`, validated with `openspec validate --strict`.
It moves the Jira ticket to In Progress only with approval, appends `propose | AWAITING_GATE_1` and stops.

### /opsx:update

`/opsx:update <what to change>` revises the existing planning artifacts and keeps them coherent (scenarios, test map,
`delta-openapi.yaml`, design, traceability). It edits no code and always reopens Gate 1.

### /opsx:apply

`/opsx:apply <change>` checks the handoff, asks the Gate 1 question and records `gate-1 APPROVED`. For each task: a test
task goes to `test-writer` (one failing test per scenario, title `FR-XXX-nnn: <scenario name>`), an implementation task
is written by the main session, and the checkpoint task runs after every group (build, lint, typecheck, test, coverage,
`openspec validate --strict`, scenarios, database check if `packages/database` changed, reviewer). Each round is appended
to `review.md`. After each task Claude stages that task's files, shows files, checks and message, and commits only after
the reply `commit`.

### /opsx:verify

`/opsx:verify <change>` runs in a fresh session (derived from the reference `/review`): it checks the handoff and
`review.md`, runs all gates, checks scenario-to-test traceability, refreshes the code graph and calls the `reviewer`
agent. It appends the `review | fresh-session review` section and the `review` handoff block, and records the `/cost`
row in `docs/token-efficiency.md`.

### /opsx:sync

`/opsx:sync <change>` merges the delta specs into `openspec/specs/` (agent-driven merge, not a copy). It runs after the
PR is merged, on the follow-up branch.

### /opsx:archive

`/opsx:archive <change>` verifies the sync, records requirement status and the `## Purpose`, moves the change to
`openspec/changes/archive/<date>-<name>/`, commits on the follow-up branch (after `commit`) and, with approval, moves the
Jira ticket to Done.

## Top-level commands

- `/create-pr <change>`: checks the review PASS head against HEAD, runs the gates, writes the PR description with the
  scenario-to-test table, pushes only after approval, then Jira In Review and the PR-link comment (each with approval).
- `/frs-ticket <request>`: turns a change request into an FRS requirement and traceability row; creates the Jira ticket
  only with approval.
- `/save-context`: writes `session-context.md` (git-ignored) before `/clear` or `/compact`.

## Gates

- **Gate 1**: `/opsx:apply` asks "Approve the spec for <name>?" and records `gate-1 APPROVED` in `handoff.md`. A
  later `propose` or `update` block cancels it. Never inferred from the request wording.
- **Open-decision gate**: no `Open` row may reach specs or apply (`.claude/rules/open-decisions.md`).
- **Checkpoint**: after every task group; a red test or `CHANGES REQUIRED` fails it (`.claude/rules/checkpoint.md`).
- **Review gate**: `/create-pr` refuses unless the latest `review` block is `PASS` for the current HEAD.
- **Gate 2**: the human reviews the code against the spec and merges.

## Handoff and review logs

- `openspec/changes/<name>/handoff.md`: append-only stage log (explore, propose, update, gate-1, apply, review, pr,
  sync, archive). Each command reads the previous stage's block first and appends its own. Statuses and "needs first"
  rules are in `.claude/rules/handoff.md`.
- `openspec/changes/<name>/review.md`: append-only checkpoint evidence (one section per group round, a final apply
  section and the fresh-session review). Format in `.claude/rules/checkpoint.md`.
- Both move to the archive with the change. No secrets or ticket text. `scripts/check-workflow.mjs` provides tested
  helpers (`checkApproval`, `checkVerified`) that read the handoff blocks; no Husky hook enforces append-only yet.

## Traceability chain

```text
Jira ticket -> proposal.md (FRS IDs) -> spec scenario "... [FR-XXX-NNN]" -> test it('FR-XXX-NNN: ...')
            -> commit (Refs: DEV-N) -> review.md -> PR body table -> archived spec
```

`pnpm check:workflow` keeps this document and `.claude/commands/opsx/` in step: a command without a `### /opsx:<name>`
heading here fails `pnpm lint`. `pnpm check:agents` requires "Follow docs/token-policy.md" in every command.

## Branches and commits

- Branch `feature/{domain}/DEV-<n>-<short-name>`; change `dev-<n>-<short-name>`. Never commit to `main`.
- Commit `type(area): <n.m> subject` with footer `Refs: DEV-N`; test-first commits use type `test`. Header at most
  72 characters, lowercase imperative subject. Claude commits only after the reply `commit`. Specs and production code
  never share a commit. Hooks (husky) run lint-staged, the secret check, commitlint and, on push, all gates. Never
  `--no-verify`.

## Reference files used

From `Todo-main` (read-only): `.claude/commands/opsx/{explore,propose,update,apply,sync,archive}.md`,
`.claude/commands/{review,create-pr,frs-ticket,save-context}.md`, `.claude/rules/*.md` (six files),
`.claude/skills/openspec-*/SKILL.md`, `CLAUDE.md` (workflow table, rule index), `openspec/config.yaml`, and the archived
change `2026-10-20-…-1002` (its auth change) as the artifact example (it has no `handoff.md` or `review.md`, so those formats come from
the rule files).

## Adaptations and reasons

| # | Adaptation | Reason |
|---|------------|--------|
| 1 | Jira fetch first in explore and propose, blockers must be Done, failures stop; Jira writes (In Progress, In Review + comment, Done) only with approval | Tickets live in Jira, not an FRS table; Rule 17 forbids unapproved tracker writes |
| 2 | Keys `DEV-<n>`, changes `dev-<n>-<name>`, branches `feature/{domain}/DEV-<n>-<name>` | Our tracker and existing history use DEV keys; mapping to DEV-10xx in `docs/mcp-setup.md` |
| 3 | `layout.md` uses our layers (`packages/*`, `services/*`, `apps/web`, `e2e/`) with domains and tags | The reference has `apps/backend`/`frontend`; ours is a microservice monorepo |
| 4 | FRS/SDS section references match our documents (FRS 1.3, 3, 4, 5, 6; SDS 5, 6.4, 7, 9, 11, 14) | Section numbers differ; workflow tickets carry no FRS IDs |
| 5 | Claude stages one task, shows files, checks and message, commits only after `commit`; `type(area): n.m subject` + `Refs: DEV-N`; test-first uses `test`; specs and code never share a commit | Our rule differs from the reference (human commits); commitlint area list is ours |
| 6 | Checkpoint commands: build, `lint --max-warnings 0`, typecheck, test, coverage >= 80% on changed files, `openspec validate --strict` | Our gates add `pnpm typecheck` |
| 7 | `/review` becomes `/opsx:verify`; one review mechanism (`reviewer` + code-review-graph); database step is a `reviewer` checklist | Assignment Rule 2 names `/opsx:verify`; we have no `security-auditor` or `db-change-checker` agents |
| 8 | Sync and archive run on a follow-up branch and reach `main` via a small PR; `implementer` agent unused by apply | The guard hook and CLAUDE.md forbid pushing to `main`; `implementer` can commit by itself |
| 9 | Every command references `CLAUDE.md`, `docs/CODING_GUIDELINES.md`, `docs/token-policy.md`; test titles are `FR-XXX-nnn: <scenario>` | Project rules; scenario titles end with the bracketed FRS ID per `openspec/config.yaml` |
| 10 | Customised files carry the "Project-customised" comment (after the frontmatter in commands and skills, because frontmatter must stay first) | Marks files that `openspec update` must not regenerate |
| 11 | Replaced the `sdd` commands; `run` orchestration lives in `handoff.md` rules and the coordinator agent; `check-workflow.mjs` and `check-agents.mjs` now read opsx/handoff | One command set; Gate 1 moved from `proposal.md` fields to the `gate-1` handoff block |
| 12 | `save-context` writes the snapshot itself (no PreCompact hook) | We have no `save-context.mjs` hook |

## Specs and guard (final state)

The `sdd-workflow` and `agent-roles` specs describe the opsx workflow (change `dev-8-workflow-final`, DEV-8):
`/opsx:apply` and the implementer guard approve a change only from the latest `gate-1 APPROVED` block of
`handoff.md` that no later `propose` or `update` block follows; the `Status: Approved` fields of `proposal.md` are
no longer read. `/create-pr` needs a `review` PASS and `/opsx:archive` runs on a follow-up branch after the merge.

Not done: no Husky hook enforces the append-only logs or the spec/code commit separation yet.

## First archive: DEV-1001

The DEV-1001 change was archived on 2026-10-30 as `openspec/changes/archive/2026-10-30-dev-1-project-setup/`. Its
delta specs are in `openspec/specs/`.
