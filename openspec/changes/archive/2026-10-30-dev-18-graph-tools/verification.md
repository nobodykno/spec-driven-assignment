# Verification: DEV-18 Codebase graph setup (`dev-18-graph-tools`)

- **Ticket:** DEV-18 (assignment ID DEV-1015), source: live MCP (Jira `paramjitjena6.atlassian.net`)
- **Approval:** Paramjit Jena, via chat, 2026-10-30 16:58 IST
- **Verified:** 2026-10-30 on `feature/DEV-18-graph-tools` after merging `main` (5c0de4e), fast mode (one
  review round; medium/low findings accepted as non-blocking)
- **Tasks:** 11/11 complete; `openspec validate dev-18-graph-tools --strict` passes
- **Independence caveat:** the `reviewer` subagent ended three times without delivering a report (about
  147k tokens, no findings recorded from it). At the user's instruction the review below was done by
  the main session using the checklist in `.claude/agents/reviewer.md`. That session also implemented
  the change, so Rules 7 and 23 (independent review) are met only in part; the human decides at checkpoint B.

## Quality gates

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` (versions, file names, Claude settings, agents, workflow, **graph docs**, ESLint, Prettier) | pass: 0 errors, 7 `no-console` warnings in the services' `error-handler.ts` (unchanged since DEV-1) |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 407 tests |
| `openspec validate --specs --strict` | pass: 9 of 9 specs |
| `node scripts/check-graph-docs.mjs` | pass |

## Traceability

Workflow changes have no FRS functional IDs (FRS §5); the scenarios use NFR-OPS-001 and NFR-MNT-001.
Tests are in `scripts/check-graph-docs.test.mjs`.

| FRS ID | Spec scenario | Test | Result |
| --- | --- | --- | --- |
| NFR-OPS-001 | Versions recorded and caches ignored | `NFR-OPS-001: exact versions for both tools pass`; `NFR-OPS-001: cache paths ignored passes`; `NFR-OPS-001: repository docs and .gitignore pass` | pass |
| NFR-OPS-001 | Missing version fails | `NFR-OPS-001: %s without a version fails` (both tools); `NFR-OPS-001: a missing tool row fails`; `NFR-OPS-001: a cache path that is not ignored fails` | pass |
| NFR-MNT-001 | Stats and queries present | `NFR-MNT-001: stats and 5 confirmed queries pass`; `docs/graph-tools.md` (7 queries) | pass |
| NFR-MNT-001 | Fewer than 5 queries fails | `NFR-MNT-001: fewer than 5 queries fails`; `NFR-MNT-001: a query without confirmation fails`; `NFR-MNT-001: missing build stats fails` | pass |
| NFR-MNT-001 | Impact output included (graph-assisted review) | no automated test; recorded evidence: `docs/token-efficiency.md` "Graph-assisted review output" and the `detect-changes` section below | pass (evidence) |
| NFR-MNT-001 | Four measured runs | `NFR-MNT-001: four measured runs with method and limitations pass`; `NFR-MNT-001: later tables in the same section are not read as runs` | pass |
| NFR-MNT-001 | Placeholder or unmeasured value fails | `NFR-MNT-001: placeholder token value "%s" fails` (TBD, ~12,000, empty, not provided); `NFR-MNT-001: fewer than four runs fails`; `NFR-MNT-001: missing limitations section fails` | pass |

## Requirements with no test

None. One scenario (impact output included) is covered by recorded evidence, not an automated test.

## Graph-assisted impact (Code Review Graph 2.3.9, `detect-changes --base main`)

12 changed files, 35 changed functions/classes, 0 affected flows, risk score 0.60, 5 test gaps: `cells`,
`name` and `read` untested directly; `section` and `firstTable` reached only through callers (the
checker functions, which the tests cover). The tool printed an estimated saving of 4,455 of 9,438
tokens (~47%); this is the tool's own estimate, not a measurement (the measured review runs are in
`docs/token-efficiency.md`).

## Review (checklist of `.claude/agents/reviewer.md`)

Checked against the source in this session, not taken from the implementation summary:

- **Checklist 1 (scenarios and tests):** every scenario maps to a test or recorded evidence (table above).
- **Checklist 2 (nothing extra):** `git diff main...HEAD` touches docs, the checker and its test,
  `.gitignore` and `package.json` scripts only; no dependency was added to any `package.json`.
- **Rule 16 (queries confirmed):** re-verified in the source: `check-claude-settings.test.mjs:5`,
  `check-claude-settings.mjs:92`, `:49`, `:169`, `:177`, `check-claude-settings.test.mjs:170`, and the
  `AppError` definition (`errors.ts:45`) and all call sites (gateway `app.ts:3,25`; `error-handler.ts`
  lines 1, 5, 16 in all three services; `common.test.ts:2`). All match `docs/graph-tools.md`.
- **Versions and ignores:** `docs/versions.md` shows uv 0.13.6, code-review-graph 2.3.9, graphifyy 0.9.97 as
  in the proposal; `git check-ignore -v` matches `.gitignore:40` (`.code-review-graph/`) and `:41` (`graphify-out/`).
- **Measured values:** the four rows equal the figures the subagents returned; the percentages recomputed
  by hand match the "Measured differences" table (task tokens +3.1%, time -31.8%; review tokens -9.4%,
  time -26.1%). The document makes no reduction claim.
- **Checklist 10 (token policy):** the three failed `reviewer` runs (about 147k tokens) were avoidable
  spend; recorded here as the one policy deviation. No whole-document reads beyond what the review needed.

### Findings

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `scripts/check-graph-docs.mjs:87-110` vs `specs/graph-tools/spec.md` ("Placeholder or unmeasured value fails") | The spec also names "a reduction claim without both measured runs". The checker rejects placeholders and requires all four measured rows, but does not scan prose for reduction claims | accepted: with all four rows required, a claim cannot rest on a missing run; the document states no reduction. Changing the approved spec needs re-approval |
| low | `scripts/check-graph-docs.mjs:87-110` | The "Measured differences" table is not recomputed from the four rows by the checker (verified by hand here) | accepted: derived figures in prose; static for a dated measurement |
| low | `scripts/check-graph-docs.test.mjs` | A version range (`^2.3.9`) is rejected by `EXACT_VERSION` but only `latest` is tested | accepted: same regex as the tested case |
| low | `scripts/check-graph-docs.mjs:20,114` | `cells` and the CLI reader `read` are not tested directly (graph test gaps) | accepted: `cells` is used by every tested function; the CLI path runs in `pnpm lint` |
| low | `scripts/check-graph-docs.mjs:8` | `GRAPH_IGNORES` hardcodes the two default cache folders | accepted: they are the tools' real defaults (verified); a change would be caught when `git status` shows them |

No critical or high finding.

### Not verifiable here

- The independent `reviewer` subagent's view (it delivered no report).
- Whether either tool sends any data externally (network not monitored; `docs/graph-tools.md` says so).
- `/cost` for this ticket (not provided yet).

## Deviations from the spec or SDS

- `check:graph-docs` was added to `pnpm lint` in task 5.1, after the documents existed, not in 1.2 as the
  task text says, so lint stayed green between commits.
- The spec's "reduction claim" clause is only partly checked in code (see the medium finding).
- The four token runs used subagents (as the user chose), so tokens are the harness's per-subagent
  figures, not `/cost`; the document says so under Limitations.
- A checker bug was found and fixed during apply (test first, 13fa885): extra tables under the
  comparison heading were read as runs.
- `main` was merged into the branch (5c0de4e); the only conflict was `package.json` (both check scripts kept).
- The review was done by the implementing session at the user's instruction (see the caveat at the top).

## Result

**READY FOR PR.** All gates pass, every scenario maps to a test or recorded evidence, and no critical or
high finding is open. This rests on a review by the implementing session, not an independent subagent;
`/cost` is not yet provided (checkpoint B).
