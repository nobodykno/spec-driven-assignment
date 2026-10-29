---
description: Implement an APPROVED change with the native OpenSpec apply workflow. Tests first, one commit per task.
argument-hint: <TICKET-KEY> <change-name>   e.g. DEV-1006 auth
---

Ticket: **$1**. Change name: ticket key in lowercase plus "-$2" (e.g. `dev-1006-auth`).
Arguments: $ARGUMENTS

## 1. Approval gate (Rule 3), mandatory
- Open `proposal.md` in the change folder under `openspec/changes/`.
- If it does not contain `Status: Approved` AND a filled-in `Approved-by:` AND `Approved-on:`, STOP immediately and say:
  "This change is not approved. Implementation is blocked."
- Do not continue for any reason, even if asked to skip. Only a human edits the approval lines.
- Confirm the current branch is `feature/$1-$2`. If not, STOP.

## 2. Implement with native OpenSpec
- Follow the native OpenSpec apply workflow (`/opsx:apply`, see `.claude/commands/opsx/apply.md`) for this change.
- Project rules for every task in `tasks.md`:
  1. Write the failing test first. Test names start with the FRS ID, e.g. `it('FR-AUTH-002: rejects wrong password', ...)`.
  2. Implement the minimum code needed to pass, following `CLAUDE.md` and the referenced SDS sections.
  3. Before using a library API you are unsure of, check it with Context7 MCP. Note the library, version and topic in `design.md` under "Docs checked".
  4. Run the task's verification command (e.g. `pnpm --filter auth test`).
  5. Tick the task in `tasks.md`.
  6. Commit with a conventional commit that references the ticket: `feat($1): <task number> <summary>` (or `fix`, `test`, `chore`, `docs`).
- Never add a dependency that isn't listed in the approved proposal. If one is needed, STOP and ask.
- Never edit an applied migration. Never read `.env` files.

## 3. If the spec turns out wrong or incomplete
- STOP. Explain the problem, propose an update to the spec files, and set `Status: Draft` again.
  Never change approved behaviour silently.

## 4. Finish
- Run all quality gates: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. All must pass.
- Print: tasks completed, commits made, gate results, and any deviations from the spec.
- Tell the user to run `/sdd:verify $1 $2` in a FRESH Claude Code session (`/clear` or a new terminal).