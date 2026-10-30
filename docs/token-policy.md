# Token policy

Mandatory for every Claude Code session and every subagent in this repository (DEV-6 design D6).
Every `sdd` command and every agent in `.claude/agents/` starts with "Follow docs/token-policy.md";
`pnpm lint` (`scripts/check-agents.mjs`) fails if one does not. Results are recorded per ticket in
`docs/token-efficiency.md`.

## Reading

- Read only the FRS/SDS sections for the current ticket's requirement IDs and SDS section numbers:
  `grep -n` for the ID or `§` number, then read that line range. Never load the whole FRS, SDS or
  ASSIGNMENT document.
- Explore code in this order: code graph query (when available, DEV-18) → grep/glob for specific
  symbols → read specific line ranges. Never read whole folders.
- Never read `node_modules`, `dist`, coverage, build output, lock files or logs. `.claude/settings.json`
  denies `Read` on `node_modules`, `dist`, `coverage` and `pnpm-lock.yaml`.

## Commands

- Tests: compact reporter, failures only. In a fix loop re-run only the failing test file; run the
  full gates (`pnpm build && pnpm lint && pnpm typecheck && pnpm test`) once at the end of each task
  group.
- Pipe long output through `tail -n 40`. Use quiet flags: `curl -s`, `docker compose logs --tail 50`,
  `pnpm --silent` where possible.

## Sessions and agents

- One ticket per session. At the end of a ticket, tell the user to run `/clear`.
- When a ticket passes about half its tasks, ask the user to run `/compact`.
- Subagents get only what they need. The reviewer gets the change folder, the diff and the relevant
  FRS IDs, and returns its fixed short report format.
- Never run two reviewers on the same change at once.

## Models

- Default: Sonnet for proposals, implementation, tests and docs.
- Opus only for security-sensitive or complex work (DEV-9 auth, DEV-20 independent review), and
  only after telling the user to switch with `/model`. The agent cannot switch models itself.

## MCP

- Call Jira only to fetch the ticket at the start and to update it at the end.

## Measurement

Before CHECKPOINT B of every ticket:

1. Ask the user to run `/cost` and paste the numbers.
2. Record in `docs/progress.md` and add a row to `docs/token-efficiency.md`: ticket, model used,
   total tokens/cost, number of files read (the agent's own count, marked "est."), number of fix
   rounds, and any policy violations.
3. If nothing is pasted, write "not provided" for tokens/cost; never estimate cost.
