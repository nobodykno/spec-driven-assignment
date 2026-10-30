# Tasks: DEV-6 Autonomous agents

Rules for every task:
- Test first, watch it fail, then implement.
- Test names start with the requirement ID, e.g. `it('NFR-TST-001: ...')`.
- One commit per task: `type(area): <n.m> <summary>` with the footer `Refs: DEV-6`. The area for this
  ticket is `workflow` (`docs` for documentation-only tasks).

## 1. Agent scope guard (D2, D3)

- [x] 1.1 Check the Claude Code docs for subagent frontmatter (`tools`, `hooks`) and hook input `agent_type`; record the result under "Docs checked" in `design.md` and pick D2 primary or fallback. Verify: `design.md` "Docs checked" filled. **[NFR-MNT-001]**
- [x] 1.2 Write `.claude/hooks/agent-scope-guard.test.mjs` first, one test per scenario:
  - `NFR-MNT-001: implementer edits allowed on an approved change`
  - `NFR-MNT-001: implementer edits blocked on an unapproved change`
  - `NFR-MNT-001: implementer push and Jira writes blocked`
  - `NFR-TST-001: test-writer test file edit allowed`
  - `NFR-TST-001: test-writer production code change blocked`
  - `NFR-MNT-001: coordinator status file update allowed`
  - `NFR-MNT-001: coordinator code change blocked`
  - `NFR-MNT-001: known agent and valid input evaluated`
  - `NFR-MNT-001: malformed input and unknown agent blocked`
  - a CLI test that pipes a real payload and asserts exit 2 and the stderr message
  - verify: `pnpm exec vitest run .claude/hooks/agent-scope-guard.test.mjs` fails
- [x] 1.3 Implement `.claude/hooks/agent-scope-guard.mjs`. Verify: `pnpm exec vitest run .claude/hooks/` passes. **[NFR-MNT-001, NFR-TST-001]**

## 2. Agent checker (D4)

- [ ] 2.1 Write `scripts/check-agents.test.mjs` first:
  - `NFR-MNT-001: valid definitions pass the checker` (fixture set)
  - `NFR-MNT-001: broken definition fails the checker` (missing file, name mismatch, empty description, reviewer with Edit, `Bash(git push:*)`, missing hook script)
  - `NFR-MNT-001: documentation out of date fails the checker`
  - verify: the tests fail
- [ ] 2.2 Implement `scripts/check-agents.mjs`; add `check:agents` to the `lint` script. Verify: `pnpm exec vitest run scripts/` passes. **[NFR-MNT-001]**

## 3. Agent definitions (D1)

- [ ] 3.1 Add `.claude/agents/implementer.md`, `test-writer.md`, `coordinator.md`; update `reviewer.md` (summary-is-a-claim rule, D1). Verify: `node scripts/check-agents.mjs` reports only the missing `docs/agents.md` sections. **[NFR-MNT-001, NFR-TST-001]**

## 4. Docs

- [ ] 4.1 Write `docs/agents.md` (five headings per agent, tools matching frontmatter); link it from `CLAUDE.md` and `docs/claude-setup.md`; say in `.claude/commands/sdd/{apply,run}.md` when each agent is used. Verify: `pnpm lint` exits 0. **[NFR-MNT-001]**

## 5. Live checks (D5)

- [ ] 5.1 Run live checks 2–5 by delegating to each agent on this branch (scratch changes reverted afterwards); ask the user to confirm check 1 (`/agents` list). Record each result in `docs/agents.md`. Verify: the checks table has a result per check. **[NFR-MNT-001, NFR-TST-001]**

## 6. Quality gates

- [ ] 6.1 Run `pnpm build && pnpm lint && pnpm typecheck && pnpm test`. Verify: all exit 0. **[NFR-MNT-001]**
