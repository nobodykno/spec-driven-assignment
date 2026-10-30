---
description: Archive a verified change with the native OpenSpec archive. Merges the delta specs into openspec/specs/ and records requirement status.
argument-hint: <TICKET-KEY> <change-name>   e.g. DEV-1006 auth
---

Follow docs/token-policy.md

Ticket: **$0**. Change name: ticket key in lowercase plus "-$1" (e.g. `dev-1006-auth`).
Arguments: $ARGUMENTS

## 1. Pre-checks, mandatory
- Confirm the current branch is `feature/$0-$1`. If not, STOP. Never archive on `main`.
- The change folder `openspec/changes/<change-name>/` exists and its `proposal.md` has
  `Status: Approved` with `Approved-by:` and `Approved-on:` filled in (rule: `checkApproval` in
  `scripts/check-workflow.mjs`).
- `verification.md` in the change folder reports **READY FOR PR** and not **NOT READY** (rule:
  `checkVerified` in `scripts/check-workflow.mjs`). Otherwise STOP and say:
  "This change is not verified. Run /sdd:verify $0 $1 first." Archive nothing.
- Every task in `tasks.md` is ticked. A task left open on purpose (e.g. a `/cost` row recorded at
  checkpoint B) must be named in `verification.md`; otherwise STOP.

## 2. Archive with native OpenSpec
- Follow the native archive workflow (`/opsx:archive`, see `.claude/commands/opsx/archive.md`) for the change:
  sync the delta specs into `openspec/specs/`, then move the folder to
  `openspec/changes/archive/<date>-<change-name>/`.
- A change with no delta specs (documentation only) uses `--skip-specs`.

## 3. Requirement status
- For every FRS ID in the change's specs, the main spec under `openspec/specs/` is now the record of
  its status (Draft → Approved → Implemented → Verified, FRS §5). Write **Verified** where the
  verification report shows a passing test for that ID.
- Workflow changes carry no FRS functional IDs. Nothing else is edited in `docs/FRS.md`.
- Write a real `## Purpose` for any new main spec (the archive leaves a placeholder).

## 4. Validate and commit
- `openspec validate --specs --strict` must pass. Fix it before committing.
- Commit on the branch: `chore(workflow): archive <change-name>` with the footer `Refs: $0`.
- The archive reaches `main` through the PR (`/sdd:ship`), never by pushing to `main`.
