---
description: Save the session's progress to session-context.md before /clear or /compact. Usage - /save-context
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(pnpm exec openspec:*), Read, Write, Edit, Glob, Grep
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow docs/token-policy.md

Write what the next session needs into `session-context.md` (repo root; it must stay uncommitted, check `git status` shows it untracked-and-ignored or tell the user to add it to `.gitignore`). Follow `CLAUDE.md`. Our project has no `PreCompact` hook, so this command writes the whole file itself; the reference project's auto snapshot is built here from git and the handoff.

1. **Snapshot** (facts only, regenerated every run) between `<!-- auto:start -->` and `<!-- auto:end -->`: current branch, `git rev-parse --short HEAD`, `git status --short` (counts and paths), the active change (`pnpm exec openspec list --json`; the one matching the branch), the last block of its `handoff.md` (stage, status, `next:`), the last section heading of its `review.md`, and the next pending tasks from `tasks.md` (first 3). Create the file with both marker pairs if it is missing.
2. **Write the notes**: replace everything between `<!-- notes:start -->` and `<!-- notes:end -->` with the text below, using Edit. Touch nothing outside those markers.

   ```
   ## Notes (<YYYY-MM-DD HH:MM>)
   - Doing: <the one thing in progress, in a sentence>
   - Done this session: <bullets: decisions made and why, files changed>
   - Next: <the exact next command or step, for example `/opsx:apply dev-9-auth` or "wait for the user's `commit` of task 2.3">
   - Waiting on: <the user's `commit`, an answer to an open decision, Docker down, Jira MCP re-auth, or "nothing">
   - Open questions: <one line each, with the recommendation, or "none">
   - Do not redo: <things already checked or ruled out>
   ```

3. **Rules for the notes**: facts and decisions only, a screenful at most. Paths, commands, IDs and statuses; no secrets, tokens, `.env` values, request bodies or pasted ticket text. State what is true now, not what you intend to do later. Do not copy what the snapshot already holds.
4. **Finish**: print the notes and say: "Saved. Run `/clear`, then start the next session with: read `session-context.md` and continue." Do not run `/clear` or `/compact` yourself.

Resuming: in the new session read `session-context.md`, then the change's `handoff.md` (the state machine decides what may run next). The notes are a hint, the handoff and `git log` are the truth; if they disagree, trust them and say so.
