---
description: Open the pull request for a verified change, move the Jira ticket to In Review. Usage - /create-pr dev-9-auth
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse:*), Bash(git push:*), Bash(git add:*), Bash(git commit:*), Bash(pnpm:*), Bash(pnpm exec openspec:*), Bash(gh pr create:*), Bash(gh pr view:*), Bash(gh repo view:*), Read, Edit, mcp__atlassian__getTransitionsForJiraIssue, mcp__atlassian__transitionJiraIssue, mcp__atlassian__addCommentToJiraIssue
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow docs/token-policy.md

Change: $ARGUMENTS

Follow `CLAUDE.md` and `docs/CODING_GUIDELINES.md`. Read `.claude/rules/handoff.md` first.

1. **Handoff check**: read `openspec/changes/<change>/handoff.md`. The latest `review` block must be `PASS` and its `head:` must equal `git rev-parse --short HEAD`, **or** every commit after that head touches only the change's `handoff.md`, `review.md`, or `docs/token-efficiency.md` / `docs/progress.md` (`git diff --name-only <head>..HEAD`). No review block, a `FAIL`, or any other later commit means stop: "Run `/opsx:verify <change>` in a fresh session first", naming which of the three failed. Also read `review.md`: its latest `review` section must be `PASS` with the same `head`; the PR description links the final result. Do not run the reviewer yourself to get around it.
2. Branch must be `feature/{domain}/DEV-<n>-<short-name>`, not `main`; the working tree clean; no `.env` or secret files in `git diff main...HEAD --name-only`. Stop otherwise.
3. Run `pnpm build`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test --coverage` (at least 80% on new code) and `pnpm exec openspec validate <change> --strict`. Stop on any failure and show the output.
4. Summarise the diff. Write the PR description with: the ticket link (Jira key `DEV-<n>`, site in `docs/mcp-setup.md`), the FRS requirements covered, a table mapping every spec scenario to its test name (FRS ID, scenario, test file : test title, result), quality gate results, review findings (fixed, and accepted low findings with reasons), deviations from the spec or SDS (or "none"), and the rollback plan from `proposal.md`. Title: `type(area): DEV-<n> <ticket title>`, at most 72 characters. End the body with the attribution line given by the session.
5. **Ask the user before pushing or creating the PR.** `git push -u origin <branch>` and `gh pr create --base main` run only after that yes. Never push to `main`, never force-push, never `--no-verify`. If `gh repo view` fails, tell the user (do not create the repository unasked).
6. **Jira (each write asked separately, only with approval)**: "Move DEV-<n> to In Review?" then `mcp__atlassian__getTransitionsForJiraIssue` and `mcp__atlassian__transitionJiraIssue`; "Add the PR link as a comment on DEV-<n>?" then `mcp__atlassian__addCommentToJiraIssue` with the PR URL. MCP failure: give the user the text to paste and continue; never invent ticket data, never retry in a loop.
7. **Record**: after the PR is created append `### pr | <date> | OPENED` to `handoff.md` (`head`, `produced:` PR URL, Jira status result, `checks:` the step 3 results, `next:` "Gate 2: human review and merge, then on a follow-up branch from `main`: `/opsx:sync <change>` then `/opsx:archive <change>`"). Stage that file, show it with the message `docs(workflow): record pr for <change>` and `Refs: DEV-<n>`, and commit and push it only after the user replies `commit`.
8. After the PR is merged, remind the user: create the follow-up branch `feature/docs/DEV-<n>-archive-<short-name>` from an up-to-date `main`, run `/opsx:sync <change>` then `/opsx:archive <change>`, and open the small follow-up PR. Sync and archive never go to `main` directly.
