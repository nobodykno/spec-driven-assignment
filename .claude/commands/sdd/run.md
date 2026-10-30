---
description: Full ticket loop. Propose → approve → apply → verify → ship → merge → archive → Jira, with two checkpoints.
argument-hint: <JIRA-KEY> <change-name>   e.g. DEV-9 auth
---

Ticket: **$0**. Change name: `$0` in lowercase plus `-$1` (e.g. DEV-9 auth → `dev-9-auth`).
Arguments: $ARGUMENTS

Run the stages below in order. Each stage follows its own command file; this file only adds the
checkpoints and the glue between them. Work autonomously between the two checkpoints.

## Rules (apply to every stage)
- Stop only at CHECKPOINT A and CHECKPOINT B. Otherwise stop only when something fails that you
  cannot fix in 3 attempts, or a decision is not covered by docs/FRS.md, docs/SDS.md or
  docs/CODING_GUIDELINES.md. Then explain what failed and what you tried.
- Never write approval without the user's exact reply `approved` (see `sdd/apply.md` §1).
- Never push before the user's `commit` at CHECKPOINT B. Never force-push. Never read `.env` files.
- Code follows docs/CODING_GUIDELINES.md. Commits: `type(area): <task> <summary>` plus the footer
  `Refs: $0` (areas: auth, tracker, gateway, web, shared, database, docker, workflow, docs).
- Do checks yourself:
  - browser: Playwright headless against the running app, screenshots in `docs/evidence/$0/`
  - long-running processes (`pnpm dev`, `docker compose up`): run in the background, wait for the
    health checks, stop them when done
  - HTTP: `curl` against localhost only
  - Docker: stop/start/up/exec/logs/ps only, never `docker compose down -v`
- Keep `docs/progress.md` up to date: ticket, stage, commits, checks, problems, human interventions.
- Use `docs/mcp-setup.md` for the Jira key ↔ assignment ID map.
- `[PARALLEL]` pairs (DEV-10 + DEV-11, DEV-14 + DEV-15): plan both, then create one git worktree per
  ticket (`git worktree add ../<repo>-<name> -b feature/<KEY>-<name> main`) and run one subagent per
  worktree in parallel. Integrate both into main, resolve conflicts, re-run all gates, and record
  commands, conflicts and results in `docs/worktrees.md`.

## a. Propose
- Follow `.claude/commands/sdd/propose.md` steps 1–5 (fetch ticket via MCP, load context, branch,
  create the OpenSpec change, validate). Commit the planning artifacts.

### CHECKPOINT A: plan
Show a short plan summary: ticket, title, dependencies (and whether each is Done), FRS IDs, files
to create or change, tasks, risks and open questions. Wait for the reply.
- Change requests → update the artifacts, re-validate, show the summary again, wait again.
- Exactly `approved` → write the approval lines in `proposal.md` (`sdd/apply.md` §1, `Approved-on`
  in IST) and commit `docs(workflow): approve <change-name>` with `Refs: $0`.

## b. Apply
- Follow `.claude/commands/sdd/apply.md` (tests first, one task at a time, one local commit per
  task, quality gates). Local commits need no approval.

## c. Verify
- Follow `.claude/commands/sdd/verify.md`. Use the `reviewer` subagent as the isolated reviewer;
  give it the diff, the change folder and the FRS, not your own summary.
- NOT READY → fix the blocking findings (with tests), commit, verify again. At most 3 rounds,
  then stop and explain.

### CHECKPOINT B: commit
Show: commits (`git log --oneline main..HEAD`), files changed (`git diff --stat main...HEAD`), gate
results, the traceability table (FRS ID → scenario → test → result), review findings (fixed /
accepted with reason) and deviations. Wait for the user to reply `commit`.

## d. Archive, ship and merge (on `commit`)
The `commit` reply approves every step in this stage, including the Jira writes. The agent never
pushes to `main`: the archive reaches `main` through the PR (the guard hook blocks pushes to `main`).
1. On the feature branch, run native `/opsx:archive` for the change (sync the delta specs), then
   commit `chore(workflow): archive <change-name>` with `Refs: $0`.
2. If `gh repo view` fails, create the repo: `gh repo create spec-driven-assignment --private --source=.`.
3. Follow `.claude/commands/sdd/ship.md` steps 1–3: push the branch, open the PR, show the link.
4. `gh pr merge <number> --merge`, then `git switch main && git pull`.
5. Delete the feature branch locally and on the remote (remove the worktree first, if any).
6. Jira via the Atlassian MCP: comment on $0 with the PR link, then transition $0 to Done
   (`getTransitionsForJiraIssue` for the id). If the MCP fails, stop and give the user the text.
7. Update `docs/progress.md` on the next ticket's branch (no commits on `main`).

## e. Next
- Name the next ticket in order (key map in `docs/mcp-setup.md`) and whether its dependencies are
  Done. Tell the user to run `/clear` and then `/sdd:run <KEY> <change-name>`. Then stop.
