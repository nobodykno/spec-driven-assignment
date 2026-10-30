# Worktrees

Log of parallel development in git worktrees for the `[PARALLEL]` pairs (DEV-10 ‖ DEV-11,
DEV-12 ‖ DEV-13, DEV-14 ‖ DEV-15): commands, conflicts, resolutions and gate results. The
`coordinator` agent plans and records here; the main session runs the commands.

| Date (IST) | Pair | Step | Command / event | Result |
| --- | --- | --- | --- | --- |
| 2026-10-30 | DEV-10 ‖ DEV-11 | Setup | `git worktree add ../spec-driven-assignment-wt/DEV-10 feature/DEV-10-projects` (same for DEV-11), then `git merge feature/DEV-9-auth` in each | Both branches start from DEV-9; deps installed per worktree (`pnpm install --frozen-lockfile`) |
| 2026-10-30 | DEV-10 ‖ DEV-11 | Agents blocked | `implementer` subagents launched, one per worktree | Blocked by `.claude/hooks/agent-scope-guard.mjs`: it reads the branch of the main checkout (`feature/DEV-9-auth`), not the worktree, so it reports "no approved change". The hook was not edited or bypassed; the main session implemented both tickets in the worktrees. DEV-11's agent had committed only its migration (7ec8cef) and left four uncommitted files, which were kept and completed. **Worktree gap for follow-up:** the hook needs to resolve the git root from the file path. |
| 2026-10-30 | DEV-10 ‖ DEV-11 | Shared prep | Small commits on DEV-9 (query helper exports, association typings, `uuidParam`) merged into both worktrees | Done before the pair started coding so `packages/database/src/models/*` and `controllers/params.ts` are not edited by both branches |
| 2026-10-30 | DEV-10 | Gates | push `feature/DEV-10-projects` | Pre-push gates passed |
| 2026-10-30 | DEV-11 | Gates | push `feature/DEV-11-tasks` | Pre-push gates passed |
| 2026-10-30 | DEV-12 ‖ DEV-13 | Setup | worktrees from `feature/DEV-11-tasks` (`git merge feature/DEV-11-tasks`) | Pushed independently; gates passed on both |
| 2026-10-30 | DEV-14 ‖ DEV-15 | Setup | worktrees from DEV-9; DEV-15 later merged `feature/DEV-14-web-auth-projects` instead of keeping hand-written stand-ins | Deviation from the DEV-15 proposal: because one session ran both tickets in sequence, DEV-14's foundation was ready, so duplicated stand-ins (and the add/add conflict they would cause) were avoided |
| 2026-10-30 | Merge | DEV-9 | PR #6 merged into main | `main` had not moved: no merge needed |
| 2026-10-30 | Merge | DEV-10 | `git merge origin/main` in the DEV-10 worktree, PR #7 | Clean merge (only the DEV-9 merge commit was new) |
| 2026-10-30 | Merge | DEV-11 | `git merge origin/main` in the DEV-11 worktree, PR #8 | **Conflict in `services/tracker/src/app.ts`**: DEV-10 and DEV-11 both added their controller/router imports, a service entry in `AppDependencies`, and their router mounts at the same lines. **Resolution:** kept both sides (imports sorted, both optional services in `AppDependencies`, tasks routers then projects router). `pnpm --filter tracker test` 37 passed, then gates on push |
| 2026-10-30 | Merge | DEV-12 | `git merge origin/main`, PR #9 | Clean merge; tracker tests 48 passed |
| 2026-10-30 | Merge | DEV-13 | `git merge origin/main`, PR #10 | **Conflict in `services/tracker/src/app.ts`**: DEV-13 wired `ActivityService`/`CommentService` and passed the activity service into `TaskService`; main had gained the projects wiring. **Resolution:** kept both; the import block combines `ActivityService`, `CommentService` and `ProjectService`, and `TaskService` keeps receiving the real `ActivityService` (FR-ACT-001). Tracker tests 60 passed |
| 2026-10-30 | Merge | DEV-14 | `git merge origin/main`, PR #11 | Clean merge; web tests 17 passed |
| 2026-10-30 | Merge | DEV-15 | `git merge origin/main`, PR #12 | Clean merge (DEV-14 commits already in the branch); web tests 28 passed |
| 2026-10-30 | Merge | DEV-16 | `git merge origin/main` in the DEV-16 worktree | Clean merge; this docs update is part of DEV-16 |
