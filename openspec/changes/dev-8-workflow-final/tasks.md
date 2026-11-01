## Conventions

- Shell: Node 22, `pnpm` only. Scenarios: 19 (sdd-workflow 14, agent-roles 5).
- Branch: `feature/docs/DEV-8-workflow-final`. Commits: `type(area): <n.m> subject`, footer `Refs: DEV-8`, area `workflow`; test-first commits use type `test`. Claude commits under the blanket approval of this run. Specs and production code never share a commit.
- No library API to verify (no new dependency). Test titles: `NFR-MNT-001: <scenario name>`.
- Several scenarios describe behaviour that already exists; their tests are expected to pass at once (note it, apply-delegation.md). Only "Legacy proposal status does not approve" must fail first.

## 1. sdd-workflow scenario tests [docs]

- [x] 1.1 [docs] Test task (`test-writer`): `scripts/check-workflow.test.mjs`, requirements "Handoff gate before implementation", "Archive after merge", "Command documentation", "Review gate before pull request". Scenarios: Propose then approved gate passes; No gate block refused; Rejected gate refused; Update after approval cancels it; Missing handoff refused; Archive requires a merged pull request and a follow-up branch; Archive syncs specs before moving the change; Every command documented; Undocumented command fails and is named; Committed repository passes the checker; Checker exits 1 for an undocumented command; Latest review pass allowed; Latest review fail refused; Missing review refused. Rename the existing tests to the scenario titles, add the two archive tests.
- [x] 1.2 [docs] Checkpoint 1 (full, `checkpoint.md`; coverage waived, no provider; database n/a).

## 2. Guard approval from the handoff only [docs]

- [x] 2.1 [docs] Test task (`test-writer`): `.claude/hooks/agent-scope-guard.test.mjs`, requirement "Implementer works on approved changes only". Scenarios: Edits allowed on an approved change; Edits blocked on an unapproved change; Reopened gate blocks edits; Legacy proposal status does not approve; Push and Jira writes blocked. Drop the test of `isApprovedProposal`.
- [ ] 2.2 [docs] Implement D1 in `.claude/hooks/agent-scope-guard.mjs` (turns "Legacy proposal status does not approve" green): remove `approvedByProposal`, `isApprovedProposal`, update the block message. Verify: `pnpm exec vitest run .claude/hooks/agent-scope-guard.test.mjs`.
- [ ] 2.3 [docs] Checkpoint 2.

## 3. Workflow documentation [docs]

- [ ] 3.1 [docs] Edit `docs/workflow.md`: replace "Not done here (follow-up)" with the final state (specs aligned, guard approves from `handoff.md`), keep the append-only note. Verify: `node scripts/check-workflow.mjs`.
- [ ] 3.2 [docs] Checkpoint 3.

## 4. Verification

- [ ] 4.1 [docs] Full-diff checkpoint, `reviewer` on `git diff main...HEAD`, then `/opsx:verify dev-8-workflow-final` in a fresh session.

## Scenario to test map

| Capability | Scenario | FRS ID | Test file | Task |
|------------|----------|--------|-----------|------|
| sdd-workflow | Propose then approved gate passes | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | No gate block refused | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Rejected gate refused | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Update after approval cancels it | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Missing handoff refused | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Archive requires a merged pull request and a follow-up branch | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Archive syncs specs before moving the change | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Every command documented | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Undocumented command fails and is named | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Committed repository passes the checker | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Checker exits 1 for an undocumented command | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Latest review pass allowed | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Latest review fail refused | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| sdd-workflow | Missing review refused | NFR-MNT-001 | scripts/check-workflow.test.mjs | 1.1 |
| agent-roles | Edits allowed on an approved change | NFR-MNT-001 | .claude/hooks/agent-scope-guard.test.mjs | 2.1 |
| agent-roles | Edits blocked on an unapproved change | NFR-MNT-001 | .claude/hooks/agent-scope-guard.test.mjs | 2.1 |
| agent-roles | Reopened gate blocks edits | NFR-MNT-001 | .claude/hooks/agent-scope-guard.test.mjs | 2.1 |
| agent-roles | Legacy proposal status does not approve | NFR-MNT-001 | .claude/hooks/agent-scope-guard.test.mjs | 2.1 |
| agent-roles | Push and Jira writes blocked | NFR-MNT-001 | .claude/hooks/agent-scope-guard.test.mjs | 2.1 |
