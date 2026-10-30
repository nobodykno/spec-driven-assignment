# Tasks: DEV-8 OpenSpec workflow

Rules: tests first; test names start with the requirement ID; one commit per task
`type(area): <n.m> <summary>` with footer `Refs: DEV-8`. Area `workflow` (`docs` for docs only).

## 1. Checker (D1, D4)

- [x] 1.1 Write `scripts/check-workflow.test.mjs` first: gate (approved / draft / blank approver), command-vs-doc sync. Verify: `pnpm exec vitest run scripts/check-workflow.test.mjs` fails. **[NFR-MNT-001]**
- [x] 1.2 Implement `scripts/check-workflow.mjs`; add `check:workflow` to `pnpm lint`. Verify: the test passes. **[NFR-MNT-001]**

## 2. Commands (D2)

- [x] 2.1 Add `.claude/commands/sdd/archive.md` (refuse unverified, native archive, FRS status note, commit). Verify: `node scripts/check-workflow.mjs`. **[NFR-MNT-001]**
- [x] 2.2 Point `/sdd:run` stage d at `/sdd:archive`; `/sdd:apply` names the gate script. Verify: checker passes. **[NFR-MNT-001]**

## 3. Documentation (D3)

- [ ] 3.1 Write `docs/workflow.md` (diagram, command reference, approval gate and record format, traceability chain, conventions, DEV-1001 archive check). Verify: checker passes. **[NFR-MNT-001]**
- [ ] 3.2 Verify the DEV-1001 archive and merged specs; run `openspec validate --specs --strict`. Verify: exits 0. **[NFR-MNT-001]**

## 4. Quality gates

- [ ] 4.1 `pnpm build && pnpm lint && pnpm typecheck && pnpm test` all pass.
