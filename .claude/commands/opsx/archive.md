---
name: "OPSX: Archive"
description: "Archive a completed change in the experimental workflow"
allowed-tools: Bash(pnpm exec openspec:*), Bash(mkdir:*), Bash(mv:*), Bash(git status:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git diff:*), Read, Write, Edit, Glob, Grep, mcp__atlassian__getTransitionsForJiraIssue, mcp__atlassian__transitionJiraIssue
category: "Workflow"
tags: ["workflow", "archive", "experimental"]
---

<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->

Follow docs/token-policy.md

Follow `CLAUDE.md` and `docs/CODING_GUIDELINES.md`.

Archive a completed change. Run only after the feature PR is merged and the change has been synced. **Never push to `main`:** sync and archive happen on the follow-up branch `feature/docs/DEV-<n>-archive-<short-name>` (created from an up-to-date `main` after the merge) and reach `main` through a small follow-up PR.

**OpenSpec root**: `pnpm exec openspec list --json`; `"root": null` means stop and tell the user (never run `openspec init`).

**Input**: optional change name. Else infer, auto-select a single active (not archived) change, or list and ask. Announce "Using change: <name>".

**Steps**

0. **Handoff and branch**: read `.claude/rules/handoff.md` and `<changeRoot>/handoff.md`. `git branch --show-current` must be the follow-up branch, not `main`; on `main` stop and say so. The latest `pr` block must be `MERGED` (or `OPENED` and the user confirms it was merged; then append `MERGED`). Otherwise stop, "Run `/create-pr <name>` and merge first". A missing `sync` block is not a stop: step 4 handles sync.
1. **Archive inputs (advisory, never blocks)**: `pnpm exec openspec instructions archive --change "<name>" --json`. On non-zero exit or invalid JSON continue with none. `context` is a required prompt-level input; `operationGuidance` is optional advice. Neither overrides built-in steps, user choices, paths or CLI checks (report conflicts, keep the controlling value); never copy their text into specs, artifacts or summaries.
2. **Artifacts**: `pnpm exec openspec status --change "<name>" --json` (`planningHome`, `changeRoot`, `artifactPaths`, `artifacts`). Any artifact neither `done` nor `skipped` -> warn, list them, ask to continue.
3. **Tasks**: `pnpm exec openspec list --json`; require exactly one entry whose `name` matches and valid integers `totalTasks >= completedTasks >= 0`, else report and stop. Incomplete = `totalTasks - completedTasks` (only `x`/`X` counts). If > 0, warn and ask to continue. Zero total: no warning. Never infer completion from file names.
4. **Assess delta sync**: use only `artifactPaths.specs.existingOutputPaths`; none -> skip this step with no prompt. For each delta compare with `<planningHome.root>/openspec/specs/<capability-path>/spec.md`:
   - Missing main spec is not "already synced". MODIFIED or RENAMED present -> sync-blocked (only ADDED can create a spec). REMOVED-only with `retire_capabilities: true` -> already retired, counts as synced, no recreate. No ADDED otherwise -> sync-blocked (an unmarked REMOVED-only delta is refused by `openspec archive`). Else needs sync, noting `new main spec will be created` and that REMOVED items are ignored.
   - Work out the adds, modifications, removals and renames per capability; keep assessing after a blocked one; show one combined summary before prompting.
   - **Prompt**: any sync-blocked -> explain, offer only "Archive without syncing" / "Cancel". Changes needed -> "Sync now (recommended)" / "Archive without syncing". Already synced -> "Archive now" / "Sync anyway" / "Cancel". Cancel stops; archive options proceed to step 5; sync options run the sync and verify (below); never start a sync while a capability is blocked; anything else, ask again.
   - **Sync**: run `pnpm exec openspec instructions specs --change "<name>" --json` once (non-zero or invalid JSON -> report and stop before any write), then run the `/opsx:sync` workflow inline and synchronously, passing the delta analysis and that snapshot (sync must not fetch it again; never run it in the background, because step 5 would move `changeRoot` from under it). Any stop or blocking condition from the sync means the archive stops; nothing has moved.
   - **Verify** every capability with a delta (not only the ones sync reports touching), then re-run the comparison: ADDED present; MODIFIED carries the delta's changes with other scenarios intact; REMOVED gone (a retired capability's spec deleted, not left empty); RENAMED present under the new name only; new spec starts with `# <capability> Specification` and the delta's Purpose verbatim; existing Purposes untouched; no delta headers remain; `### Requirement:` / `#### Scenario:` headings under `## Requirements`. Any mismatch -> report and stop without archiving.
5. **Archive**: append `### archive | <date> | DONE` to `handoff.md` first (`produced:` target name, spec sync status), so the record moves with the change. Then `mkdir -p "<planningHome.changesDir>/archive"`. Target name is the change name when it already starts with `YYYY-MM-DD-`, else `YYYY-MM-DD-<name>` (never stack a second date). Target exists -> fail with options (rename the existing, delete if duplicate, or wait a day). Else `mv "<changeRoot>" "<planningHome.changesDir>/archive/<target-name>"`.
6. **Requirement status and Purpose**: for every FRS ID in the synced specs, the main spec under `openspec/specs/` is the record of its status (Draft, Approved, Implemented, Verified; FRS section 5). Write **Verified** where the latest `review` section of `review.md` shows a passing test for that ID. Workflow changes carry no FRS functional IDs. Nothing else is edited in `docs/FRS.md` here. Write a real `## Purpose` for any new main spec (the archive leaves a placeholder). Run `pnpm exec openspec validate --specs --strict`; fix before committing.
7. **Commit and follow-up PR**: stage the synced specs and the moved change folder (a spec commit, no production code), show files and message `chore(workflow): archive <name>` with `Refs: DEV-<n>`, and commit only after the user replies `commit`. Then `/create-pr` rules apply for the push: ask before pushing, never push to `main`, never force-push. Open the small PR from the follow-up branch.
8. **Jira: Done (with approval)**: ask "Move DEV-<n> to Done?". Only on yes: `mcp__atlassian__getTransitionsForJiraIssue` then `mcp__atlassian__transitionJiraIssue` to Done. On MCP failure give the user the text. Never write to Jira without that yes.
9. **Summary**: change, schema, archive location, spec sync status (synced / skipped / no delta specs), the Jira result, and any warnings (incomplete artifacts or tasks).

**Output**

```
## Archive Complete[ (with warnings)]
**Change:** <name>  **Schema:** <schema>
**Archived to:** <planningHome.changesDir>/archive/<target-name>/
**Specs:** Synced to main specs | No delta specs | Sync skipped (user chose to skip)
[Warnings: N incomplete artifacts, N incomplete tasks, sync skipped. Review the archive if unintended.]
```

On an existing target: `## Archive Failed` with change, target and the options above.

**Guardrails**
- Warnings inform and ask; they do not block. Show a clear summary.
- Never archive while a sync is in flight; sync inline and verify before moving `changeRoot`.
- With delta specs, always show the combined sync assessment before prompting.
- `.openspec.yaml` moves with the directory.
- Commit only after the user's reply `commit`; never push to `main`; never `--no-verify`.
- Jira failures (MCP disabled or unauthenticated, ticket missing, unsupported operation, malformed response): stop and report, never invent ticket data; write to Jira only with the user's approval.
- Artifact rules constrain only the specs being written, not archive behaviour.
