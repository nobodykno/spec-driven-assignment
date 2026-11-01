<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Checkpoint and review.md

Every task group ends with the same checkpoint, and every checkpoint leaves a record in `review.md`. A group with no record has not passed. This file is the evidence log; `handoff.md` (see `handoff.md`) is the state machine and only points here. Test output is compact and re-runs only failing files (`docs/token-policy.md`); the full set runs once per checkpoint.

## The checkpoint

Runs at the end of **every** group, whatever its layer. Run every step even when an earlier one fails, so the record is complete; the checkpoint passes only if all applicable steps pass.

| # | Check | Command | Passes when |
|---|-------|---------|-------------|
| 1 | Build | `pnpm build` | 0 errors |
| 2 | Lint | `pnpm lint --max-warnings 0` | 0 errors, 0 warnings |
| 3 | Types | `pnpm typecheck` | 0 errors |
| 4 | Tests | `pnpm test` | 0 failed, 0 red. No new `.skip`, `.only` or `todo`; skipped count does not rise |
| 5 | Coverage | `pnpm test --coverage` | the run exits 0 and every non-test file changed in the group has at least 80% line coverage in the per-file report. A changed file missing from the report is a failure unless it holds no executable code (types only), which the record states. `e2e/` and config-only files have no source coverage |
| 6 | Spec | `pnpm exec openspec validate <change> --strict` | valid |
| 7 | Scenarios | the tests named by the group's test tasks | every scenario test of this group is green, and its title is `FR-XXX-nnn: <scenario name>` |
| 8 | Database | `reviewer` with the database checklist (migration reversible and proven with migrate + undo, no edited applied migration, indexes from SDS 5.3, access only through `@app/database`) | only when the group changed `packages/database` (`git diff --name-only <last checkpoint head> -- packages/database`); no high or medium finding. Otherwise record `n/a (no database changes)` |
| 9 | Review | `code-review-graph update` (advisory), then `reviewer` (brief in `apply-delegation.md`) | `RESULT: APPROVE` (the reviewer's verdict) with no critical or high finding. If the graph is missing or fails, the reviewer works from the diff and the report says `graph: unavailable` |

Rules:

- **A red test fails the checkpoint.** Red tests exist only inside a group, between a test task and the implementation task that turns it green (test-first). None may be present at the checkpoint, and none may carry over a group boundary. Never fix a red test by editing, skipping or weakening it.
- **A group of only docs or config** still runs steps 1 to 4, 6 and 9; step 5 is `n/a (no source changes)`.
- **Never claim a step passed from memory.** Each result comes from the command run in this checkpoint; the record quotes the numbers (tests passed, lowest coverage file).
- **On FAIL:** fix critical, high and medium findings and any red check, then run the whole checkpoint again as a new round. Ask the user after two failed rounds on the same finding.
- The final group also runs the full-diff reviewer (`git diff main...HEAD`, every scenario), as in `apply-delegation.md`.
- There is one review mechanism: the `reviewer` agent, using the code-review-graph (`docs/graph-tools.md`) as an advisory pointer. No other review agent is part of the checkpoint or of `/opsx:verify`.

## review.md

`openspec/changes/<name>/review.md`, inside the change folder, committed with the change, archived with it.

- **Append only.** Add a section at the end with Edit. Never rewrite, reorder or delete an earlier section, including failed rounds. A correction is a new section.
- Created by the first checkpoint with the header `# Review log: <name>` and the line `Append only. See .claude/rules/checkpoint.md.`
- No secrets, tokens, request bodies or ticket text. Paths, counts, commands and agent tables only.

### Section format

```
## <YYYY-MM-DD> | <apply|review> | <subject> | <PASS|FAIL>
head: <git rev-parse --short HEAD>
round: <n>        (checkpoint sections only; restarts at 1 for each group)

| Check | Command | Result |
|-------|---------|--------|
| build | pnpm build | 0 errors |
| lint | pnpm lint --max-warnings 0 | 0 warnings |
| typecheck | pnpm typecheck | 0 errors |
| test | pnpm test | 212 passed, 0 failed, 0 skipped |
| coverage | pnpm test --coverage | 4 changed files, lowest 86% (src/x.ts) |
| spec | openspec validate dev-9-auth --strict | valid |
| scenarios | group test tasks | 6/6 green |
| database | reviewer (database checklist) | PASS / n/a (no database changes) |
| reviewer | reviewer | APPROVE (0 critical, 0 high, 1 medium, 2 low) |
| graph | code-review-graph | used / unavailable / stale |

Findings: <the reviewer's findings table unchanged, or "none">
Next: <what happens now>
```

- `<subject>` for apply is `group <n>: <title>` or `final`. For `/opsx:verify` it is `fresh-session review`.
- A `/opsx:verify` section uses the same table with the rows that command ran (all gates, `reviewer`, `graph`) and quotes the reviewer's table unchanged. Its result is `PASS` only if every gate is green and the verdict is APPROVE.
- The heading line is machine-readable: a later stage finds the latest section for a subject by reading headings.

## What is enforced where

The rules above are conventions that the commands follow and `/opsx:verify` checks (every group has a latest `apply | group <n>` section that is PASS, an `apply | final` section exists, earlier lines of `review.md` and `handoff.md` are unchanged in `git diff`). No Husky hook enforces them yet; do not claim it does.

## Who writes what

| Writer | Section | When |
|--------|---------|------|
| `/opsx:apply` | `apply \| group <n>` | after every checkpoint round, PASS or FAIL |
| `/opsx:apply` | `apply \| final` | after the last group's full-diff reviewer |
| `/opsx:verify` | `review \| fresh-session review` | after its gates and the reviewer return |

`handoff.md` blocks quote only the result and name the `review.md` heading, for example `checks: PASS, see review.md "2026-11-02 | apply | group 2"`.
