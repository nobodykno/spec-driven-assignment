## Context

DEV-17 (DEV-1014) asks for evidence of parallel development with git worktrees. The evidence mostly exists already (the `docs/worktrees.md` table, `docs/progress.md` incidents, git history of 2026-10-30 and 2026-11-01), but it is not organised per acceptance criterion and nothing keeps it complete. The change reshapes the document and adds a small script check, the pattern DEV-7 used for `docs/mcp-setup.md`. Follows `.claude/rules/layout.md` (one worktree per parallel ticket, `coordinator` records in `docs/worktrees.md`); no SDS section applies.

## Goals / Non-Goals

Goals: the four acceptance criteria each have a section a reader and a script can find; every command, SHA and graph line comes from git, not from memory; the 2026-11-01 run and its incidents are recorded; `pnpm lint` fails when a section or its evidence disappears.
Non-goals: application code, new worktrees or artificial conflicts, changing the `coordinator` agent or hooks, screenshots as images, any FR change.

## Contract

No `packages/shared` schema is added or changed (no endpoint, no form). The "contract" is the shape of `docs/worktrees.md` read by `scripts/check-worktree-docs.mjs`. Sections are second-level headings matched by exact text:

- `## Commands`: third-level subsections `### DEV-1007 || DEV-1008` and `### DEV-1011 || DEV-1012` (the separator may be `||` or `‖`), each with a fenced block holding at least two `git worktree add` lines that name the pair's branches (`feature/DEV-10-...`, `feature/DEV-11-...`, `feature/DEV-14-...`, `feature/DEV-15-...`); the section as a whole also holds a `git worktree list` line and a `git worktree remove` line.
- `## Merge conflicts`: table `| Date | Branch | File | Cause | Resolution | Re-verified |`; each data row has a file path, a resolution, and a Re-verified cell containing a `pnpm` command and a result.
- `## Shared contracts approved before parallel work`: table `| Pair | Commit | What was approved |`; one row per pair (`DEV-1007 || DEV-1008`, `DEV-1011 || DEV-1012`), Commit holds a 7 to 40 hex SHA.
- `## Evidence`: a fenced block whose first line is `$ git log --graph ...` followed by graph lines (`*`, `|`, `\`, `/`) with at least one line containing `Merge`; a fenced block whose first line is `$ git worktree list` followed by at least two lines that start with an absolute path.

Checker API (all pure, exported from `scripts/check-worktree-docs.mjs`): `checkCommands(doc)`, `checkConflicts(doc)`, `checkContractApproval(doc, commitExists)`, `checkEvidence(doc)`, each returning `string[]` findings; `checkWorktreeDocs(doc, commitExists)` concatenates them; `run(root, { commitExists })` returns `{ code, lines }` for the CLI and the tests. Findings are plain sentences that start with `docs/worktrees.md:` and name the missing or bad item.

## Data model

No schema change (SDS 5 untouched).

## Decisions

- **D1 (resolves OD-1): evidence is taken from existing history.** The `app.ts` conflicts of DEV-11 and DEV-13 (2026-10-30) and any conflicts in the merge commits of the 2026-11-01 run (found with `git log --merges` and `git show <merge>` at apply) fill AC-2. Rejected: staging a conflict now, which would be invented evidence.
- **D2 (resolves OD-2): AC-3 cites, per pair, the commit that put the shared contract on the branches before the first worktree add.** Found with `git log` at apply; if git shows none for a pair, apply raises it as a new open decision instead of writing a SHA. Rejected: citing the pair's PR merge commit (it comes after the parallel work).
- **D3 (resolves OD-3): terminal output as fenced text.** It can be diffed, regenerated and checked. Rejected: PNG screenshots (binary, unverifiable by script); they can be added later without a spec change.
- **D4 (resolves OD-4): `checkContractApproval` takes a `commitExists` predicate.** The CLI passes one backed by `git cat-file -e <sha>^{commit}` (read-only; spawned with `execFileSync`, no shell); tests pass a fake, plus one test that uses the real repository. Rejected: format-only check (a made-up SHA would pass).
- **D5: one script, pure functions plus a CLI, wired as `pnpm check:worktree-docs` into `pnpm lint` after `check:mcp-docs`.** Same pattern as `check-workflow.mjs`, `check-mcp-docs.mjs`. Rejected: extending `check-workflow.mjs` (it guards the OpenSpec stage logs; mixing doc-evidence checks makes both harder to test).
- **D6: test titles use the ticket acceptance-criterion ID.** Workflow ticket without FR IDs, so tests are titled `DEV-1014-AC-n: <scenario name>` and scenario names end with `[DEV-1014-AC-n]` (same as DEV-7 D4).
- **D7: the existing dated table stays as the chronological log.** The new sections are added above it so earlier history is not rewritten; only the intro line is updated.

## Layer plan

- `[docs]` `docs/worktrees.md`: sections above, plus a "Parallel run 2026-11-01" section (five worktrees for DEV-12 to DEV-16 under `.claude/worktrees/`, one `*_test` database each, `npm_config_workspace_concurrency=2`, the rule "push from the main checkout, check `git config --local core.bare`") linking `docs/progress.md` incidents.
- `[docs]` `scripts/check-worktree-docs.mjs` and `scripts/check-worktree-docs.test.mjs` (vitest, picked up by `vitest run scripts/` in `pnpm test`); `package.json` script and lint chain.
- No `[shared]`, `[database]`, service, `[web]`, `[e2e]` or `[docker]` work. No query keys, no error mapping (no endpoint).

## Security and privacy

Follows SDS 7 only in spirit: the document holds paths, branch names, SHAs, counts and command output, no tokens, no `.env` content, no ticket text (`CLAUDE.md` Never). Home-directory paths in `git worktree list` output are kept as they are in the repository (existing docs already show them). The CLI spawns `git` with a fixed argument list and the SHA only after it matches `^[0-9a-f]{7,40}$`, so no shell and no injection. Evidence commands run read-only (`git log`, `git worktree list`, `git reflog`, `git show`); apply never creates or removes a worktree to produce them.

## Docs checked

No library is added. Git behaviour (`git worktree add/list/remove`, `git cat-file -e`) is checked against the local `git help` pages and the real output at apply; Context7 holds no git manual. Node `child_process.execFileSync` and `node:fs` are used as in `scripts/check-versions.mjs`; nothing new.

## Risks / Trade-offs

- The real-repository scenario depends on git history that exists in this clone. A shallow clone or a rebase that drops a cited SHA makes `pnpm lint` fail. Mitigation: the finding names the SHA; the CLI skips the existence check with a printed notice when `git` itself is unavailable (not when the SHA is unknown).
- Commands copied from history may name worktrees that no longer exist (`git worktree remove` already ran). The document says the paths are the historical ones; `git worktree list` output in Evidence is the current state, which is why the check only needs two lines.
- Hook environments leak `GIT_DIR` inside a linked worktree (`docs/progress.md`). The check only reads, so it is safe there; the test for the real repository clears nothing and accepts either layout.

## Migration and rollback

No data or migration. Rollback is a revert of the commits (proposal: Rollback).

## Open questions

OD-1 to OD-4 are `Assumed` (proposal register), none `Open`. Gate 1 may challenge them; OD-2 may turn into an Open row at apply if git shows no approving commit for a pair.
