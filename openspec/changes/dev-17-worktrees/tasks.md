## Conventions

- Shell: Node 22, `pnpm` only. Scenarios: 15 in one capability (`worktree-evidence`).
- Branch: `feature/docs/DEV-17-worktrees`. Commits: `type(area): <n.m> subject` with footer `Refs: DEV-17`, area `workflow`; test-first commits use type `test`. Claude commits only after the human replies `commit`, per `apply-delegation.md`; specs and production code never share a commit (here everything is docs and scripts, no spec file changes after Gate 1).
- Library APIs to check with Context7 before use: none (no library is added; `node:fs`, `node:path`, `node:child_process` as in `scripts/check-versions.mjs`). Git behaviour is checked with `git help` and the real output.
- Test titles: `DEV-1014-AC-n: <scenario name>` (workflow ticket, design D6). Test file for all scenarios: `scripts/check-worktree-docs.test.mjs`. Fixtures are inline strings; only the group 4 scenarios read the real repository.
- Evidence rule: every command, SHA, date and graph line in `docs/worktrees.md` is copied from `git log`, `git reflog`, `git worktree list` or `git show` at apply time. Nothing is retyped from memory and nothing is invented; a gap is reported (design D2), not filled.

## 1. Commands (AC-1) [docs]

- [x] 1.1 [docs] Test task (`test-writer`): `scripts/check-worktree-docs.test.mjs`, requirement "Worktree commands documented". Scenarios: Commands for both pairs documented; Missing remove command rejected; Pair without its add commands rejected. All fail first (module missing).
- [x] 1.2 [docs] Implement `checkCommands` in `scripts/check-worktree-docs.mjs` (turns 1.1 green; AC-1). Verify: `pnpm exec vitest run scripts/check-worktree-docs.test.mjs`.
- [x] 1.3 [docs] Checkpoint 1 (full, `checkpoint.md`; coverage on `scripts/check-worktree-docs.mjs`; database check n/a).

## 2. Conflicts and contract approval (AC-2, AC-3) [docs]

- [x] 2.1 [docs] Test task (`test-writer`): same file, requirements "Merge conflict resolved and re-verified" and "Contract approval referenced by commit". Scenarios: Conflict with resolution and gates recorded; Conflict without re-verification rejected; Conflicts section without an entry rejected; Approval commit recorded per pair; Row without commit reference rejected; Reference to unknown commit rejected.
- [x] 2.2 [docs] Implement `checkConflicts` and `checkContractApproval(doc, commitExists)` (turns 2.1 green; AC-2, AC-3). Verify: `pnpm exec vitest run scripts/check-worktree-docs.test.mjs`.
- [x] 2.3 [docs] Checkpoint 2.

## 3. Evidence and CLI (AC-4) [docs]

- [x] 3.1 [docs] Test task (`test-writer`): same file, requirement "Integration evidence recorded" and the CLI part of "Worktree log checked in lint". Scenarios: Graph excerpt and terminal output present; Graph excerpt without a merge commit rejected; Evidence without terminal output rejected; Findings make the CLI exit 1.
- [x] 3.2 [docs] Implement `checkEvidence`, `checkWorktreeDocs`, `run` and the CLI entry, including the `git cat-file -e` predicate with `execFileSync` and the hex-only guard (turns 3.1 green; AC-2, AC-4). `package.json` is not changed yet. Verify: `pnpm exec vitest run scripts/check-worktree-docs.test.mjs`.
- [x] 3.3 [docs] Checkpoint 3.

## 4. Worktree log content and lint wiring (AC-1 to AC-4) [docs]

- [x] 4.1 [docs] Test task (`test-writer`): same file, requirement "Worktree log checked in lint", real-repository part. Scenarios: Repository worktree log passes the check; Lint chain runs the worktree check. Both must fail first (the sections and the script entry do not exist yet).
- [x] 4.2 [docs] Collect the evidence from git, read-only, and put the raw output in the apply progress notes (not committed): `git worktree list`, `git reflog` and shell history for the add/remove commands of DEV-10 || DEV-11 and DEV-14 || DEV-15, `git log --graph --oneline` around the merges of PR #7 to #12 and of the 2026-11-01 run, `git log --merges` and `git show` of the conflicted merges, and the commit that put the shared contract on the branches before each pair started (design D2). Anything git cannot show is raised as a new open decision before step 4.3.
- [x] 4.3 [docs] Restructure and extend `docs/worktrees.md` (design Contract, D7; sections Commands, Merge conflicts, Shared contracts approved before parallel work, Evidence, Parallel run 2026-11-01 with its incidents), add `check:worktree-docs` to `package.json` and append `pnpm check:worktree-docs` to the `lint` chain after `check:mcp-docs`; add one line to `docs/workflow.md` if it lists check scripts, and a pointer line in `docs/progress.md` (turns 4.1 green; AC-1 to AC-4). Verify: `pnpm exec vitest run scripts/check-worktree-docs.test.mjs` and `pnpm check:worktree-docs`.
- [x] 4.4 [docs] Checkpoint 4 (turns every real-repository scenario green; `pnpm lint --max-warnings 0` now includes the new check).

## 5. Verification [docs]

- [x] 5.1 [docs] Full-diff run of the checkpoint (`pnpm build`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test --coverage`, `pnpm exec openspec validate dev-17-worktrees --strict`), `reviewer` on `git diff main...HEAD` (including a check that each SHA and command in `docs/worktrees.md` matches git), then `/opsx:verify dev-17-worktrees` in a fresh session.

## Scenario to test map

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| worktree-evidence | Commands for both pairs documented | DEV-1014-AC-1 | scripts/check-worktree-docs.test.mjs | 1.1 |
| worktree-evidence | Missing remove command rejected | DEV-1014-AC-1 | scripts/check-worktree-docs.test.mjs | 1.1 |
| worktree-evidence | Pair without its add commands rejected | DEV-1014-AC-1 | scripts/check-worktree-docs.test.mjs | 1.1 |
| worktree-evidence | Conflict with resolution and gates recorded | DEV-1014-AC-2 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Conflict without re-verification rejected | DEV-1014-AC-2 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Conflicts section without an entry rejected | DEV-1014-AC-2 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Approval commit recorded per pair | DEV-1014-AC-3 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Row without commit reference rejected | DEV-1014-AC-3 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Reference to unknown commit rejected | DEV-1014-AC-3 | scripts/check-worktree-docs.test.mjs | 2.1 |
| worktree-evidence | Graph excerpt and terminal output present | DEV-1014-AC-4 | scripts/check-worktree-docs.test.mjs | 3.1 |
| worktree-evidence | Graph excerpt without a merge commit rejected | DEV-1014-AC-4 | scripts/check-worktree-docs.test.mjs | 3.1 |
| worktree-evidence | Evidence without terminal output rejected | DEV-1014-AC-4 | scripts/check-worktree-docs.test.mjs | 3.1 |
| worktree-evidence | Findings make the CLI exit 1 | DEV-1014-AC-2 | scripts/check-worktree-docs.test.mjs | 3.1 |
| worktree-evidence | Repository worktree log passes the check | DEV-1014-AC-4 | scripts/check-worktree-docs.test.mjs | 4.1 |
| worktree-evidence | Lint chain runs the worktree check | DEV-1014-AC-4 | scripts/check-worktree-docs.test.mjs | 4.1 |
