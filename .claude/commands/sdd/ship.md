---
description: Push the branch and open a GitHub PR with full ticket → spec → test → review traceability.
argument-hint: <TICKET-KEY> <change-name>   e.g. DEV-1006 auth
---

Ticket: **$0**. Change name: ticket key in lowercase plus "-$1" (e.g. `dev-1006-auth`).
Arguments: $ARGUMENTS

## 1. Pre-checks
- `verification.md` exists in the change folder (or in its `openspec/changes/archive/<date>-<change>/`
  copy, after `/sdd:run` stage d archived it) and says READY FOR PR. If not, STOP.
- The working tree is clean and the branch is `feature/$0-$1`. If not, STOP.
- No `.env` or secret files appear in `git diff main...HEAD --name-only`. If any do, STOP.

## 2. PR description
Title: `feat(<area>): $0 <ticket title>` (≤ 72 characters, see docs/CODING_GUIDELINES.md)

Body sections:
- **Ticket:** $0 (link) and ticket source (live MCP / fixture)
- **OpenSpec change:** change folder path and approval (approver, date)
- **Requirements covered:** FRS IDs
- **Traceability:** table FRS ID → scenario → test (from verification.md)
- **Quality gates:** build / lint / typecheck / test results
- **Review findings:** fixed, plus accepted non-blocking findings with reasons
- **Deviations:** from the spec or SDS, or "none"
- **Rollback plan:** from proposal.md

## 3. Push and open the PR (ask the user before each step)
- `git push -u origin feature/$0-$1`
- `gh pr create --base main --title "<title>" --body-file <temp file>`
- Show the PR URL.

## 4. Issue tracker (Rule 17)
- Ask the user for explicit approval before writing anything to the tracker.
- If approved, add a comment on $0 with the PR link via MCP. If the MCP doesn't support comments, say so and give the user the text to paste.

## 5. Next
The change is archived on the feature branch before the PR (`/sdd:run` stage d), so nothing is
pushed to `main` after the merge.