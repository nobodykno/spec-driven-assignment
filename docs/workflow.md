# Workflow: ticket to archived change

Every ticket goes through the same loop. The `/sdd:*` commands (`.claude/commands/sdd/`) wrap the
native `/opsx:*` OpenSpec commands (`.claude/commands/opsx/`, generated, never edited) and add the
project rules: a live Jira fetch, an approval gate, tests first, an independent review and a PR with
full traceability.

## Lifecycle

```text
 Jira ticket
     |  /sdd:propose   fetch via MCP, read FRS/SDS, create the OpenSpec change   (Status: Draft)
     v
 CHECKPOINT A  ---- human replies exactly `approved` ---->  Status/Approved-by/Approved-on written
     |  /sdd:apply     tests first, one commit per task, gates at the end
     v
     |  /sdd:verify    gates + independent reviewer subagent + traceability  -> verification.md
     v
 CHECKPOINT B  ---- human replies `commit` ---->
     |  /sdd:archive   native archive: specs merged, folder moved           (on the branch)
     |  /sdd:ship      push branch, open PR with traceability
     v
 merge PR  ->  Jira comment + transition to Done
```

`/sdd:run <KEY> <name>` runs the whole loop with the two checkpoints. In fast mode (see
`docs/progress.md`) the proposals of a group share one checkpoint A and one checkpoint B.

## Command reference

### /sdd:propose

`/sdd:propose <KEY> <name>` fetches the ticket through the Jira MCP (stops on any MCP failure, no
offline fixture), checks that its dependencies are Done, reads the FRS/SDS sections it needs, creates
branch `feature/<KEY>-<name>` and the change `openspec/changes/<key>-<name>/` with the native
propose workflow, validates it with `openspec validate --strict`, commits the planning artifacts and
stops. It writes no code and installs nothing.

### /sdd:apply

`/sdd:apply <KEY> <name>` implements an approved change. It first runs the approval gate (below) and
refuses otherwise. Then for each task: failing test (named with the FRS ID), minimum implementation,
the task's verify command, tick in `tasks.md`, one commit. It never adds a dependency that is not in
the approved proposal. When the spec is wrong it stops and sets `Status: Draft` again.

### /sdd:verify

`/sdd:verify <KEY> <name>` runs in a fresh session: native verify, the four quality gates, an
independent `reviewer` subagent and an FRS traceability table. It writes `verification.md` with the
result **READY FOR PR** or **NOT READY** (critical/high findings or a requirement without a test).

### /sdd:archive

`/sdd:archive <KEY> <name>` archives a verified change on its branch: it refuses without a
`READY FOR PR` report, runs the native archive (delta specs merged into `openspec/specs/`, folder
moved to `openspec/changes/archive/<date>-<name>/`), records requirement status, validates all specs
and commits `chore(workflow): archive <name>`.

### /sdd:ship

`/sdd:ship <KEY> <name>` pushes the branch (the pre-push hook runs build, lint, typecheck and test) and
opens a PR whose body links ticket, spec, tests and review. It never pushes to `main`.

### /sdd:run

`/sdd:run <KEY> <name>` chains propose, approval, apply, verify, archive, ship, merge and the Jira
update, stopping at checkpoint A (`approved`) and checkpoint B (`commit`).

## Approval gate

`/sdd:apply` and `/sdd:archive` refuse to continue unless `proposal.md` starts with this record:

```text
Ticket: DEV-N
Ticket source: live MCP
Status: Approved
Approved-by: Paramjit Jena (via chat)
Approved-on: 2026-10-30 16:58 IST
```

- `Status` is `Draft` until the human replies exactly `approved` in chat for that change. "ok",
  "looks good" or "go ahead" do not count.
- `Approved-by` and `Approved-on` must both be filled in. A spec change after approval sets
  `Status: Draft` again.
- The rule has a tested reference implementation: `checkApproval` in `scripts/check-workflow.mjs`
  (tests in `scripts/check-workflow.test.mjs`); `checkVerified` is the same for `verification.md`.
  The `/sdd:*` commands apply the rule as written instructions, and `pnpm lint` does not read
  proposals, so the gate is enforced by the command text and, for the implementer subagent, by its hook.
- The implementer subagent has the same gate as an agent-scoped hook (`docs/agents.md`).

## Traceability chain

```text
Jira ticket -> proposal.md (FRS IDs) -> spec scenario "... [FR-XXX-NNN]" -> test it('FR-XXX-NNN: ...')
            -> commit (Refs: DEV-N) -> verification.md table -> PR body -> archived spec
```

`pnpm check:workflow` keeps this document and `.claude/commands/sdd/` in step: a command without a
`### /sdd:<name>` heading here fails `pnpm lint`.

## Branches and commits

- Branch `feature/<TICKET>-<name>`. Never commit to `main`; the archive commit also goes through the PR.
- Commit `type(area): <task> <subject>` with footer `Refs: DEV-N`. Header at most 72 characters, lowercase
  imperative subject. Areas: auth, tracker, gateway, web, shared, database, docker, workflow, docs.
- Hooks (husky) run lint-staged and the secret check on commit, commitlint on the message and all gates on
  push. Never `--no-verify`; fix the cause.

## First archive: DEV-1001

The DEV-1001 change was archived on 2026-10-30 as
`openspec/changes/archive/2026-10-30-dev-1-project-setup/`. Its delta specs are in `openspec/specs/`
(`git-hooks`, `local-environment`, `quality-gates`, `service-health`, `web-api-status`). DEV-8 verified this and did
not archive it a second time.
