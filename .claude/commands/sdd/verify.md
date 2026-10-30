---
description: Verify a change against its spec (native OpenSpec verify), run an independent review, and write an FRS traceability report. Run in a fresh session.
argument-hint: <TICKET-KEY> <change-name>   e.g. DEV-1006 auth
---

Ticket: **$0**. Change name: ticket key in lowercase plus "-$1" (e.g. `dev-1006-auth`).
Arguments: $ARGUMENTS

Run this in a fresh session. Do not rely on any summary from the implementing session (Rule 7, Rule 23).

## 1. Quality gates (Rule 21)
Run and record pass/fail for: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## 2. Native OpenSpec verification
- Follow the native OpenSpec verify workflow (`/opsx:verify`, see `.claude/commands/opsx/verify.md`) for this change.

## 3. Independent review
- Use the `reviewer` subagent on `git diff main...HEAD`, together with the approved change folder and `docs/FRS.md`.
- If a graph tool is configured, include the change's impact radius and affected tests from the graph, and confirm key findings in the source code.

## 4. Traceability report
Write `verification.md` inside the change folder, containing:
- Ticket, ticket source (live MCP / fixture), approver and date
- Gate results table: check | result
- Traceability table: FRS ID | spec scenario | test file : test name | result
- Requirements with no test (must be empty to pass)
- Reviewer findings: severity | file:line | issue | status (fixed / accepted with reason)
- Deviations from the spec or SDS

## 5. Result
- If any gate fails, any FRS ID has no test, or any critical/high finding is unresolved: report **NOT READY** and list what blocks it (Rule 24).
- Otherwise report **READY FOR PR** and tell the user to run `/sdd:ship $0 $1`.
- Commit the report: `docs(workflow): verification report for <change-name>` with the footer `Refs: $0`.