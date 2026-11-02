# Worktrees

Log of parallel development in git worktrees for the `[PARALLEL]` pairs DEV-1007 || DEV-1008 (DEV-10 and
DEV-11) and DEV-1011 || DEV-1012 (DEV-14 and DEV-15), plus the later pairs DEV-12 || DEV-13 and the 2026-11-01
run: commands, conflicts, resolutions, gate results and evidence. The `coordinator` agent plans and records here;
the main session runs the commands. `scripts/check-worktree-docs.mjs` (run by `pnpm lint`) checks the sections
below. Every command, SHA and graph line is copied from git, not retyped (change `dev-17-worktrees`, DEV-1014).

## Commands

Paths are the historical ones; `git worktree list` under Evidence shows the current state.

### DEV-1007 || DEV-1008

```bash
git worktree add ../spec-driven-assignment-wt/DEV-10 feature/DEV-10-projects
git worktree add ../spec-driven-assignment-wt/DEV-11 feature/DEV-11-tasks
git merge feature/DEV-9-auth   # run in each worktree so both start from DEV-9
```

### DEV-1011 || DEV-1012

```bash
git worktree add ../spec-driven-assignment-wt/DEV-14 feature/DEV-14-web-auth-projects
git worktree add ../spec-driven-assignment-wt/DEV-15 feature/DEV-15-web-tasks
```

### List and remove

```bash
git worktree list
git worktree remove --force .claude/worktrees/agent-ac1632ffd31c231c2   # 2026-11-01, a finished agent worktree
```

## Merge conflicts

Both conflicts are the same file: two parallel branches added their routers and services at the same lines of
`services/tracker/src/app.ts`. The merge commits are `7abf11f` (DEV-11) and `369d5ca` (DEV-13).

| Date | Branch | File | Cause | Resolution | Re-verified |
| --- | --- | --- | --- | --- | --- |
| 2026-10-30 | feature/DEV-11-tasks | services/tracker/src/app.ts | DEV-10 and DEV-11 both added controller and router imports, an `AppDependencies` entry and router mounts at the same lines | kept both sides (imports sorted, both optional services in `AppDependencies`, tasks routers then projects router), merge commit 7abf11f | `pnpm --filter tracker test` 37 passed, then the gates on push |
| 2026-10-30 | feature/DEV-13-comments-activity | services/tracker/src/app.ts | DEV-13 wired `ActivityService` and `CommentService` and passed the activity service into `TaskService`; main had gained the projects wiring | kept both; the import block combines `ActivityService`, `CommentService` and `ProjectService`, `TaskService` keeps the real `ActivityService` (FR-ACT-001), merge commit 369d5ca | `pnpm --filter tracker test` 60 passed |

## Shared contracts approved before parallel work

| Pair | Commit | What was approved |
| --- | --- | --- |
| DEV-1007 || DEV-1008 | `45f1e37` | the shared auth and domain contracts (`feat(shared): 1.1-1.2 add auth and domain contracts`), committed 18:11:52 IST on 2026-10-30, before the DEV-9 approval `f5db3c7` (18:14:44) and before the DEV-10 and DEV-11 approvals `f05837a` and `2ec4eaf` (18:29:46) and their first code commits |
| DEV-1011 || DEV-1012 | `45f1e37` | the same contracts; DEV-9 (with them) was merged into the two branches in `e43d1e2` (DEV-14, 18:32:35) and `143a1c3` (DEV-15, 18:32:47) before they started coding; the dev-14 approval is `c3d5294` |

## Evidence

```text
$ git log --graph --format='%h %s' b646409^..0a1b874
*   0a1b874 Merge pull request #7 from nobodykno/feature/DEV-10-projects
|\  
| *   7be1c92 Merge remote-tracking branch 'origin/main' into feature/DEV-10-projects
| |\  
| |/  
|/|   
* | b646409 Merge pull request #6 from nobodykno/feature/DEV-9-auth
| * 5ea3919 feat(tracker): 2.1-2.5 add project endpoints and access control
| * 45218f0 feat(database): 1.1 add projects and members migration
| *   e6d0e1b Merge branch 'feature/DEV-9-auth' into feature/DEV-10-projects
| |\  
| |/  
|/|   
* | ccd87b4 feat(database): 2.4 type model associations, add uuid param helper
```

Both blocks above and below are point-in-time copies taken when this section was written (commit 4.3 of the change); the worktree list shows the checkout state of that moment.

```text
$ git worktree list
/Users/paramjitj/Documents/spec-driven-assignment                                            86b7374 [feature/docs/DEV-17-worktrees]
/Users/paramjitj/Documents/spec-driven-assignment-wt/DEV-10                                  7be1c92 [feature/DEV-10-projects]
/Users/paramjitj/Documents/spec-driven-assignment-wt/DEV-10-fix                              bea493a [feature/DEV-10-owner-race]
/Users/paramjitj/Documents/spec-driven-assignment-wt/DEV-11                                  7abf11f [feature/DEV-11-tasks]
```

## Parallel run 2026-11-01

Five agents worked at the same time, each in its own worktree under `.claude/worktrees/` on its own branch, for
DEV-12 to DEV-16 (retroactive verification). Each used its own PostgreSQL test database (name must match
`[a-z0-9_]+_test`) and `npm_config_workspace_concurrency=2` for pushes. Incidents
(details in `docs/progress.md`): `core.bare` in the shared `.git/config` became `true`; the guard tests ran inside a
worktree pre-push hook, inherited `GIT_DIR`, and wrote two junk `init` commits to the DEV-12 branch, which was
rebuilt from the last good commit, the polluted remote branch deleted and the clean branch pushed under a new name;
DB-backed tests timed out under load (load average 10 to 24). Rule learned: push from the main checkout, never from
a linked worktree.

## Chronological log

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
