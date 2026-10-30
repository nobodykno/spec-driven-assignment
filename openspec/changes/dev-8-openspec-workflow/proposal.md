Ticket: DEV-8
Ticket source: live MCP
Status: Draft
Approved-by:
Approved-on:

# Proposal: DEV-8 OpenSpec workflow

> Jira issue `DEV-8` is titled "[DEV-1005] OpenSpec workflow — ticket-to-change traceability,
> approval gates, verification and archival". The assignment ID is **DEV-1005**.

## Why

The `/sdd:*` commands (propose, apply, verify, ship, run) exist but are only described in scattered
places. There is no `/sdd:archive`, no single document explaining every stage and gate, and no test
that proves the approval gate refuses unapproved changes (Assignment Rules 2, 3, 4, 25, 26).

## FRS requirements covered

Workflow tickets are specified in their OpenSpec change, not in the FRS (FRS §5).

| ID | Coverage |
| --- | --- |
| NFR-MNT-001 | `scripts/check-workflow.mjs` runs in `pnpm lint`: command files, approval record and `docs/workflow.md` stay consistent |
| Assignment Rules 2, 3, 4, 25, 26 | Ticket-to-change traceability, approval gate, verification, archival with spec merge |

## SDS sections followed / changed

- **Followed:** §3 Repository structure, §11 Testing strategy.
- **Changed:** none.

## Affected packages

Root only: `docs/workflow.md`, `.claude/commands/sdd/archive.md`, `.claude/commands/sdd/run.md` (call
archive), `scripts/check-workflow.mjs` (+ test), root `package.json` lint script, `openspec/config.yaml`
untouched.

## What Changes

- **`docs/workflow.md`**: lifecycle diagram (ticket → propose → approve → apply → verify → review → PR →
  archive), command reference, approval gate, traceability chain, commit/branch conventions.
- **`/sdd:archive <KEY> <name>`**: refuses unless verify passed; runs native `openspec archive`; updates
  FRS requirement status in the specs; commits `chore(workflow): archive <name>`.
- **Approval record format** (Status / Approved-by / Approved-on) specified in `docs/workflow.md`.
- **Checker + test** `scripts/check-workflow.mjs`: the approval gate logic (unapproved, approved but
  blank `Approved-by`, approved) as a tested function shared with the doc rules.
- **Archive of DEV-1001**: already done (`openspec/changes/archive/2026-10-30-dev-1-project-setup`).
  Nothing to archive; the task verifies the folder, that its specs are in `openspec/specs/`, and records
  that in `docs/workflow.md`. No second archive is created.

## New dependencies

None.

## Database changes

None.

## Rollback plan

Revert the commits; delete `.claude/commands/sdd/archive.md`, `docs/workflow.md`, the checker and its
lint hook. Archived changes stay as they are.

## Ticket dependencies

- DEV-1 (DEV-1001) — **Done** (checked live, 2026-10-30). Blocks DEV-21 (not started).

## Open questions

1. The ticket says "Archive the completed DEV-1001 change". It is already archived (2026-10-30). OK to
   treat that as satisfied and only verify it?
