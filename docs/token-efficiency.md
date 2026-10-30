# Token efficiency

One row per ticket, written before CHECKPOINT B as described in `docs/token-policy.md`
("Measurement"). Tokens/cost come only from the user's `/cost` paste; "files read" is the agent's own
count (est.). DEV-18 (DEV-1015) adds the formal baseline vs graph-assisted comparison.

| Ticket | Model | Tokens / cost (`/cost`) | Files read (est.) | Fix rounds | Policy violations |
| --- | --- | --- | --- | --- | --- |
| DEV-6 (DEV-1003) | Opus 5.5 (session started before the policy) | not provided | ~45 (est.) | 1 review round; 3 lint fix loops | before the policy (16:33 IST): whole reads of the DEV-5 proposal and part of the guard; after: none noted. `/agents` menu not confirmed by the human. |

## Baseline vs graph-assisted

Four runs on 2026-10-30, each a fresh read-only `general-purpose` subagent on the same frozen
snapshot (commit `432c345`, the DEV-8 tip). Tokens, tool calls and time are the figures the subagent
harness returned for each run, not `/cost`. "Files examined" is the agent's own count (self-reported).
"Findings" is what the run reported; its quality is in the table below.

| Run | Mode | Tokens | Files examined | Time | Findings | Tool calls |
| --- | --- | --- | --- | --- | --- | --- |
| Task | baseline | 35,663 | 1 | 45.9 s | 10 | 7 |
| Task | graph-assisted | 36,779 | 1 | 31.3 s | 10 | 5 |
| Review | baseline | 50,095 | 9 | 49.8 s | 8 | 5 |
| Review | graph-assisted | 45,396 | 6 | 36.8 s | 8 | 4 |

- **Task:** list every place that must change if the `AppError` constructor (`packages/shared/src/errors.ts`)
  gets a new required parameter, with `file:line` and covering tests. Ground truth, counted with `grep`
  before the runs: 1 definition + 9 constructor calls = 10 locations. "Findings" = locations found.
- **Review:** review `git diff d3f56fb..HEAD` (DEV-8) against its approved change; at most 8 findings.

### Measured differences

| Comparison | Baseline | Graph-assisted | Difference |
| --- | --- | --- | --- |
| Task tokens | 35,663 | 36,779 | +3.1% (more, not fewer) |
| Task time | 45.9 s | 31.3 s | -31.8% |
| Task tool calls | 7 | 5 | -2 |
| Review tokens | 50,095 | 45,396 | -9.4% |
| Review time | 49.8 s | 36.8 s | -26.1% |
| Review tool calls | 5 | 4 | -1 |

### Quality of the results

| Run | Result checked against the source |
| --- | --- |
| Task, baseline | All 10 locations found, plus 3 stale doc references (`services/CLAUDE.md:15`, `SKILL.md:45,52`). |
| Task, graph-assisted | The same 10 locations and 3 doc references. The graph alone was not enough: `code-review-graph query callers_of AppError` returned an ambiguous result with no callers, and Graphify listed `common.test.ts` only as an import, missing its two constructor calls. The agent filled the gaps with `grep`/`sed`. Its report said "8" call sites but listed 9. |
| Review, baseline | 8 findings. Confirmed: a real new defect, `.claude/commands/sdd/verify.md:39` still tells users to run `/sdd:ship` after READY FOR PR, which skips `/sdd:archive` (not found by the other review runs); the doc omits `--skip-specs` and the all-tasks-ticked pre-check; the gate-not-called-by-CLI and `NOT READY` substring issues. Not usable: 5 findings cite lines 168–244 of files that have 58 and 87 lines, and finding 8 (my verification report has wrong line numbers) is false. |
| Review, graph-assisted | 8 findings, line references correct where checked: `checkVerified` substring match (`check-workflow.mjs:27`), a missing `.claude/commands/sdd` folder passes silently (`:43`), the all-tasks-ticked rule has no function or test (`archive.md:19`). It did not find the `verify.md:39` defect. Finding 6 (`ship.md` vs `archive.md` archived-copy handling) was not checked here. |

## Graph-assisted review output (Code Review Graph)

From the graph-assisted review run, `code-review-graph detect-changes --base d3f56fb --brief`:
14 changed files, 21 changed functions/classes, 0 affected flows, 1 test gap (`field`,
`scripts/check-workflow.mjs:10`, reached only through a caller), overall risk 0.60 (highest on `field`,
then `checkVerified` 0.45 and `checkApproval` 0.4). `query tests_for checkVerified` returned 3 tests.
`graphify affected scripts/check-workflow.mjs` (depth 2) listed the test file, `apply.md`, `archive.md`
and `docs/workflow.md`. Blast radius: small; the only new coupling is `pnpm lint` calling `check:workflow`.
The tool's own savings estimate for the DEV-8 review (4,353 of 7,706 tokens, ~56%, printed by
`detect-changes` earlier) is an estimate; the measured review difference above is -9.4%.

## Method

- Frozen snapshot: two git worktrees at `432c345`, `wt-base` (no graph files) and `wt-graph` (both graphs
  built there first: Code Review Graph 2.3.9 in 2.1 s, Graphify 0.9.97 in 1.9 s; this build time is not in the
  run numbers). Both under the session scratchpad, removed afterwards.
- Same prompt for both modes except the tool rule: baseline = Read, Grep, Glob and plain git, no graph tools;
  graph-assisted = start with `code-review-graph` and `graphify` queries, then confirm in the source.
- Four fresh subagents (same model, no shared context), read-only, started together. Results were then
  checked against the source by the main session; the task also against a `grep` ground truth.

## Limitations

- One run per cell. Differences of a few percent (task tokens +3.1%) are within the noise of a single run
  and say nothing about a trend. No claim of a reduction is made from these four runs; the review run is
  9.4% lower in tokens, which one run cannot establish.
- The four runs ran in parallel, so time is affected by machine load and by which finished first.
- Tokens are the harness's per-subagent figure; how it counts cached or tool-result tokens is not
  documented, and it is not `/cost`.
- "Files examined" is self-reported and inconsistent (the baseline task run said 1 file but grep-checked
  several); do not compare it between runs. Tool calls are the more reliable measure of effort.
- The baseline agents had no `Grep` tool in this session and used `grep` through Bash, so the baseline tool
  mix differs slightly from the plain description.
- The review findings differ between runs, so the findings count is not a quality measure. Only the task
  has a ground truth; review quality was judged by me on the findings I could check.
- Small codebase (about 170 code files, 1 TypeScript monorepo plus scripts): graph savings, if any, would be
  larger on a bigger codebase. Not measured here.
- The graph tools missed call sites that `grep` found (see above), so graph output must be confirmed in the source.
