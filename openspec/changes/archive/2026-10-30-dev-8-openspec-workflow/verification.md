# Verification: DEV-8 OpenSpec workflow (`dev-8-openspec-workflow`)

- **Ticket:** DEV-8 (assignment ID DEV-1005), source: live MCP (Jira `paramjitjena6.atlassian.net`)
- **Approval:** Paramjit Jena, via chat, 2026-10-30 16:58 IST
- **Verified:** 2026-10-30 on `feature/DEV-8-openspec-workflow`, fast mode (one reviewer round;
  medium/low findings accepted as non-blocking)
- **Tasks:** 7/7 complete; `openspec validate dev-8-openspec-workflow --strict` passes

## Quality gates

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` | pass: 0 errors, 7 `no-console` warnings in the services' `error-handler.ts` (unchanged since DEV-1). Run with the untracked DEV-18 cache `graphify-out/` moved aside: it is not git-ignored on this branch, so Prettier scans it and exits 1. Environment only, not a DEV-8 defect |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 388 tests |
| `openspec validate --specs --strict` | pass: 8 of 8 specs |
| `node scripts/check-workflow.mjs` | pass |

## Traceability

Workflow changes have no FRS functional IDs (FRS §5); the scenarios use NFR-MNT-001.
Tests are in `scripts/check-workflow.test.mjs`.

| FRS ID | Spec scenario | Test | Result |
| --- | --- | --- | --- |
| NFR-MNT-001 | Approved change passes | `NFR-MNT-001: approved change with approver and date passes` | pass |
| NFR-MNT-001 | Draft change refused | `NFR-MNT-001: draft change is refused`; `NFR-MNT-001: a proposal with no status line is refused` | pass |
| NFR-MNT-001 | Approved without approver refused | `NFR-MNT-001: approved without Approved-by is refused`, `... Approved-on is refused` | pass |
| NFR-MNT-001 | Verified change archived | `NFR-MNT-001: READY FOR PR report passes`; `/sdd:archive` command (`.claude/commands/sdd/archive.md`) | pass (command text is reviewed, not run) |
| NFR-MNT-001 | Unverified change refused | `check-workflow.test.mjs:41` (verification gate: a failing report is refused); `NFR-MNT-001: a missing report is refused` | pass |
| NFR-MNT-001 | Every command documented | `NFR-MNT-001: every command documented passes`; `NFR-MNT-001: the repository passes` | pass |
| NFR-MNT-001 | Undocumented command fails | `NFR-MNT-001: undocumented command fails and is named`; `NFR-MNT-001: exits 1 and names the command when a command is undocumented` | pass |
| NFR-MNT-001 | Strict validation passes | `openspec validate --specs --strict`: 8 of 8 | pass |

## Requirements with no test

None. One scenario (archive moves the folder and merges specs) is covered by the native
OpenSpec archive, which already ran for DEV-1, DEV-5 and DEV-6, not by an automated test of the new
`/sdd:archive` command itself. `/sdd:archive` has its first real run at this change's archive step.

## Graph-assisted impact (Code Review Graph 2.3.9, `detect-changes --base main`)

12 changed files, 21 changed functions/classes, 0 affected flows, risk score 0.60, 1 test gap
(the helper `field` in `scripts/check-workflow.mjs`, reached only through `checkApproval`, which the
tests cover). Estimated token saving printed by the tool: 4,353 of 7,706 (~56%); this is the tool's own
estimate, not a measurement.

## Reviewer findings

One round (`reviewer` subagent, read-only, on `git diff main...HEAD`): CHANGES REQUIRED, 0 critical,
0 high, 2 medium, 6 low. The reviewer could not run commands; gate results above are from this session.
Its claim about the implementer hook was checked here: `.claude/hooks/agent-scope-guard.mjs:25,138`
blocks implementer edits with `not-approved`.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `scripts/check-workflow.mjs:42-58`, `docs/workflow.md:85` | `checkApproval`/`checkVerified` are tested but not called by the CLI; doc said "the rule is code" | **fixed**: doc now says tested reference implementation, applied by the command text and the implementer hook; `pnpm lint` does not read proposals |
| medium | `specs/sdd-workflow/spec.md:19-25,40-45` | Three scenarios (archive, unverified refused, strict validation) had no test or recorded evidence | **fixed**: evidence recorded in this report (traceability table, `openspec validate --specs --strict` 8/8, `checkVerified` tests); the first real `/sdd:archive` run is this change's archive step |
| low | `docs/workflow.md:71` vs `check-workflow.mjs:10-12` | `field` matches the first `Status:` line anywhere, not only the header | accepted: proposals are generated with the header first; anchoring is a follow-up |
| low | `check-workflow.mjs:23-29` | `checkVerified` refuses any report that contains the failing-result phrase anywhere, even quoted (this report had to avoid the phrase to pass its own gate) | accepted: errs on the safe side (refuses) |
| low | `check-workflow.mjs:36` | heading regex accepts `/sdd:run-all` for `run` and `##`-`####` | accepted: no such command exists |
| low | `.claude/commands/sdd/archive.md:27-33` | Requirement status step is vague | accepted: workflow changes carry no FRS IDs; the step is a no-op for them |
| low | `docs/workflow.md:107-112` | DEV-1001 archive claims are not enforced | accepted: static note, dated 2026-10-30 |
| low | commits 1.2 / 3.2 | Which commit changed `package.json` | not an issue: `git log` shows d5c9fa3 (1.2) adds the `check:workflow` script and a9a9157 (3.2) adds it to `lint` |

## Deviations from the spec or SDS

- `check:workflow` was added to `pnpm lint` in task 3.2, after `docs/workflow.md` existed, not in 1.2 as
  the task text says, so lint stayed green between commits.
- DEV-1001 was verified as already archived (agreed at checkpoint A); no second archive was made.

## Result

**READY FOR PR.** All gates pass, every scenario maps to a test or recorded evidence, and no critical or
high finding is open. `/cost` was not yet provided (checkpoint B); the token row will read "not provided"
if it is not pasted.
