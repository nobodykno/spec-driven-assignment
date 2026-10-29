---
description: Start a ticket. Fetch it via MCP, read FRS/SDS, create the OpenSpec change with the native workflow, then STOP for human approval.
argument-hint: <TICKET-KEY> <change-name>   e.g. DEV-1006 auth
---

You are starting work on ticket **$1**. The change name is the ticket key in lowercase plus "-$2" (e.g. DEV-1006 auth → `dev-1006-auth`).
Arguments: $ARGUMENTS

## 1. Retrieve the ticket (Rule 1)
- Use the issue-tracker MCP to fetch ticket $1: title, description, acceptance criteria, dependencies, status.
- If the MCP is unavailable, returns an auth error, the ticket is missing, or the response is malformed:
  - STOP and tell the user exactly what failed.
  - Only continue if the user explicitly says to use a fixture. Then read `docs/tickets/$1.md`
    and record "Ticket source: FIXTURE (<reason>)". Never present fixture data as live.
- Check that every dependency ticket is done. If not, STOP and report which ones are blocking.

## 2. Load context
- Read `docs/FRS.md` and list the requirement IDs this ticket covers (see FRS section 5, traceability).
- Read the relevant sections of `docs/SDS.md`.
- Read `openspec/specs/` for existing behaviour.
- If a graph tool (Code Review Graph / Graphify) is configured, query it for affected files first instead of reading whole folders.

## 3. Branch
- Ensure the working tree is clean. If not, STOP and report.
- Create and switch to branch `feature/$1-$2` from an up-to-date `main`.

## 4. Create the change with native OpenSpec
- Follow the native OpenSpec propose workflow (`/opsx:propose`, see `.claude/commands/opsx/propose.md`)
  to create the change folder in `openspec/changes/`.
- Apply all project rules from `openspec/config.yaml` (ticket header, FRS IDs in scenario titles, SDS references, task grouping).
- The proposal must start with:
  Ticket: $1
  Ticket source: live MCP
  Status: Draft
  Approved-by:
  Approved-on:
- If the ticket introduces a requirement that isn't in the FRS, add it to `docs/FRS.md` in this change and mark it "(new in $1)".

## 5. Validate
- Run `openspec validate <change-name> --strict` and fix any errors.

## 6. STOP
- Do NOT write implementation code. Do NOT install packages.
- Commit only the planning artifacts: `docs($1): propose <change-name>`.
- Print a summary: ticket, FRS IDs covered, files created, open questions.
- Tell the user: "Review the change in openspec/changes/. To approve, set `Status: Approved` and fill in Approved-by and Approved-on in proposal.md, then run /sdd:apply $1 $2."