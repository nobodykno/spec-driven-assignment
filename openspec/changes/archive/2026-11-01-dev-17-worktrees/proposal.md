## Why

Ticket **DEV-17** (assignment ID **DEV-1014**): document and demonstrate parallel development with git worktrees, branch integration and conflict resolution (assignment Rules 9, 10, 11, as named in the ticket).

This is a workflow ticket: FRS section 5 maps no FR IDs to DEV-1014 (FRS line 385 lists it among the workflow tickets), so the change traces to the ticket's acceptance criteria (DEV-1014-AC-1 to AC-4 below). FRS/SDS sections: none apply; the conventions followed are `.claude/rules/layout.md` (parallel tickets use one worktree each, the `coordinator` agent records them in `docs/worktrees.md`) and `docs/token-policy.md`.

Observed (cite files): `docs/worktrees.md` is a 23-line table log of the 2026-10-30 pairs (DEV-10 || DEV-11, DEV-12 || DEV-13, DEV-14 || DEV-15). It names `git worktree add` once in prose, has no `git worktree list` or `git worktree remove` command, no `git log --graph` excerpt, no re-verification result in a form a check can read, and no commit reference for the contracts approved before the pairs started. The two `app.ts` conflicts (DEV-11, DEV-13) are inside table cells. `docs/progress.md` ("Incidents during the parallel retro-verify run") records the second, larger run of 2026-11-01 (five agents in five worktrees under `.claude/worktrees/` for DEV-12 to DEV-16, one test database each) with real incidents, which `docs/worktrees.md` does not mention.

Proposed: restructure `docs/worktrees.md` so each acceptance criterion has its own section, fill it from git history (never from memory), and add a small tested checker so the evidence cannot silently rot, the way `scripts/check-mcp-docs.mjs` guards `docs/mcp-setup.md`.

## Ticket

- Key: DEV-17 (DEV-1014), summary "Git worktrees: parallel development, integration and conflict resolution" (assignment title `[DEV-1014] Git worktrees — parallel development, integration and conflict resolution`), status **To Do** (live fetch by the main session, 2026-11-01).
- Blockers ("is blocked by"): DEV-10 (DEV-1007) **Done**, DEV-11 (DEV-1008) **Done**, DEV-14 (DEV-1011) **Done**, DEV-15 (DEV-1012) **Done**.
- Acceptance criteria (parsed from the description):
  - DEV-1014-AC-1 `docs/worktrees.md` shows the exact `git worktree add/list/remove` commands used for DEV-1007 || DEV-1008 and DEV-1011 || DEV-1012.
  - DEV-1014-AC-2 At least one real merge conflict is shown with how it was resolved and re-verified (quality gates after the merge).
  - DEV-1014-AC-3 Shared contracts were approved before parallel work started (commit reference).
  - DEV-1014-AC-4 Evidence: a `git log --graph` excerpt and screenshots or terminal output.
- Requirements line: Assignment Rules 9, 10, 11.

## What Changes

- `[docs]` Restructure `docs/worktrees.md` (keep the existing dated table as the chronological log) with one section per acceptance criterion: "Commands" (add, list and remove for each of the two pairs, copied from the shell history and `git reflog`/`git worktree list`, not retyped from memory), "Merge conflicts" (the `services/tracker/src/app.ts` conflicts of DEV-11 and DEV-13 and any conflict of the 2026-11-01 run, each with file, cause, resolution and the gate command and result after the merge), "Shared contracts approved before parallel work" (one row per pair with the commit SHA), "Evidence" (`git log --graph` excerpt and terminal output of `git worktree list`).
- `[docs]` Add a section for the 2026-11-01 parallel run (DEV-12 to DEV-16 in five worktrees, one `*_test` database each) and its incidents (`core.bare` flipped to `true`, junk `init` commits from guard tests under a worktree pre-push hook, load timeouts), linked to `docs/progress.md`, with the rules that came out of them.
- `[docs]` Add `scripts/check-worktree-docs.mjs` (exported, tested check functions plus a CLI) and `scripts/check-worktree-docs.test.mjs`; wire `check:worktree-docs` into the `lint` chain in `package.json` after `check:mcp-docs`.

## Traceability

| FR ID | FRS wording (short) | Capability | Spec requirement |
|-------|---------------------|------------|------------------|
| none (workflow ticket, FRS section 5) | DEV-1014-AC-1 worktree add/list/remove commands for both pairs | worktree-evidence | Worktree commands documented |
| none | DEV-1014-AC-2 real conflict, resolution and re-verification | worktree-evidence | Merge conflict resolved and re-verified |
| none | DEV-1014-AC-3 contracts approved before parallel work, commit reference | worktree-evidence | Contract approval referenced by commit |
| none | DEV-1014-AC-4 `git log --graph` excerpt and terminal output | worktree-evidence | Integration evidence recorded |
| none | DEV-1014-AC-1 to AC-4 kept honest by `pnpm lint` | worktree-evidence | Worktree log checked in lint |

## Open decisions

| ID | Question | Options | Recommendation | Impact if wrong | Status | Resolved by |
|----|----------|---------|----------------|-----------------|--------|-------------|
| OD-1 | Which conflicts count as "real" for AC-2? | A: the `app.ts` conflicts already in the log (DEV-11, DEV-13, 2026-10-30) plus any conflict found in the merge commits of the 2026-11-01 run. B: stage a new artificial conflict now | A, because they happened, are in git history, and the ticket asks for a real conflict; an artificial one would be invented evidence | UI only (docs content) | Assumed | assumption, changeable at Gate 1 |
| OD-2 | Which commit is the "contracts approved before parallel work" reference for AC-3? The 2026-10-30 run predates the `gate-1` handoff block, so no `gate-1 APPROVED` exists for DEV-10 to DEV-15 | A: per pair, the last commit that put the shared contract (shared-prep commits on DEV-9, `packages/shared` schemas, `delta-openapi.yaml` of the pair's changes) on the branches before the first `git worktree add`, found with `git log`. B: record the gap as a deviation without a SHA | A, with the SHA verified by the checker; if git shows no such commit for a pair, record it honestly as a deviation (checker allows a row only with a SHA, so that would be raised at apply as a new open decision) | scope (evidence wording) | Assumed | assumption, changeable at Gate 1 |
| OD-3 | "Screenshots/terminal output": which form? | A: terminal output in fenced text blocks, reproducible from git. B: also PNG screenshots in `docs/` | A, because it can be diffed and checked by the script, and adds no binary; B can be added later without changing the spec | UI only | Assumed | assumption, changeable at Gate 1 |
| OD-4 | Does the checker call `git` to prove each referenced SHA exists? | A: yes, the CLI passes a `git cat-file -e` predicate into the tested function; tests inject a fake. B: format check only (7 to 40 hex characters) | A, because a made-up SHA must fail the check. Lint runs inside hooks that may sit in a linked worktree (`GIT_DIR` leak, `docs/progress.md` incident), but `cat-file` reads, never writes | none (script only) | Assumed | assumption, changeable at Gate 1 |

## Out of scope

- Any application code, tests outside the new script's test, database or CI change; no FRS or SDS requirement is added or changed (FRS 1.3 and SDS 13 unaffected).
- Changing the `coordinator` agent, `agent-scope-guard` hook or the guard tests (the `GIT_*` clearing follow-up in `docs/progress.md` stays a separate item).
- Creating new worktrees or conflicts to demonstrate; the evidence comes from history that already exists.
- Screenshots as image files (OD-3).

## Capabilities

### New Capabilities
- `worktree-evidence`: the worktree log in `docs/worktrees.md` (commands, conflicts, contract approval, evidence) and the lint check that keeps it complete.

### Modified Capabilities
None.

## Impact

- `docs/worktrees.md` (restructured, extended), `docs/progress.md` (one link line if needed; no table change).
- New `scripts/check-worktree-docs.mjs` and `scripts/check-worktree-docs.test.mjs`; `package.json` gets one script `check:worktree-docs` and the `lint` chain one more step.
- No database change: **No schema change**. No endpoint change.
- New dependencies: **None**.
- Existing scenarios that must stay green: `scripts/check-workflow.test.mjs`, `scripts/check-mcp-docs.test.mjs`, `scripts/check-file-names.test.mjs`, `scripts/check-versions.test.mjs`, and every package test (nothing outside docs and scripts is touched).

## Rollback

Revert the commits. Removing the `check:worktree-docs` step from `lint` and restoring the previous `docs/worktrees.md` returns to the current state. No data or migrations.

## Docs follow-up

`docs/worktrees.md` (the deliverable), `docs/workflow.md` only if it lists the check scripts (add one line), `docs/progress.md` (point the incident table at the new section). FRS section 5 and SDS section 14 need no row. At archive, record the capability `worktree-evidence` as Verified.
