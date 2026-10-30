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

- [x] 2.1 Write `scripts/check-agents.test.mjs` first:
  - `NFR-MNT-001: valid definitions pass the checker` (fixture set)
  - `NFR-MNT-001: broken definition fails the checker` (missing file, name mismatch, empty description, reviewer with Edit, `Bash(git push:*)`, missing hook script)
  - `NFR-MNT-001: documentation out of date fails the checker`
  - verify: the tests fail
- [x] 2.2 Implement `scripts/check-agents.mjs`; add `check:agents` to the `lint` script. Verify: `pnpm exec vitest run scripts/` passes, except the committed-files test, which passes once tasks 3.1 and 4.1 add the agents and docs. **[NFR-MNT-001]**
- [x] 2.3 Extend `scripts/check-agents.test.mjs` first (D6):
  - `NFR-MNT-001: policy referenced everywhere` (fixture set with the line in every agent and sdd command)
  - `NFR-MNT-001: missing policy reference fails the checker` (agent without the line, `sdd/ship.md` without it, `docs/token-policy.md` missing)
  - verify: the new tests fail
- [x] 2.4 Extend `scripts/check-agents.mjs` with the token-policy checks. Verify: `pnpm exec vitest run scripts/check-agents.test.mjs` passes except the committed-files test (passes after 4.2). **[NFR-MNT-001]**

## 3. Agent definitions (D1)

- [ ] 3.1 Add `.claude/agents/implementer.md`, `test-writer.md`, `coordinator.md`; update `reviewer.md` (summary-is-a-claim rule, D1; checklist item 10 "Did the implementation session follow the token policy? Note any whole-file or whole-doc reads that weren't needed.", D6). Every agent file has the line "Follow docs/token-policy.md". Verify: `node scripts/check-agents.mjs` reports only the missing `docs/agents.md` sections. **[NFR-MNT-001, NFR-TST-001]**

## 4. Docs and token policy (D6)

- [ ] 4.1 Write `docs/agents.md` (five headings per agent, tools matching frontmatter); link it from `CLAUDE.md` and `docs/claude-setup.md`; say in `.claude/commands/sdd/{apply,run}.md` when each agent is used. Verify: `pnpm lint` exits 0. **[NFR-MNT-001]**
- [ ] 4.2 Write `docs/token-policy.md` (D6: reading, commands, sessions and agents, models, MCP). Replace the "Token efficiency" section in `CLAUDE.md` with a short "Token efficiency (mandatory)" section linking to it. Add "Follow docs/token-policy.md" as the first line after the frontmatter of `.claude/commands/sdd/{propose,apply,verify,ship,run}.md`, and the `/cost` step before checkpoint B in `sdd/verify.md` and `sdd/run.md`. Verify: `node scripts/check-agents.mjs` and `node scripts/check-claude-settings.mjs` exit 0. **[NFR-MNT-001]**
- [ ] 4.3 Create `docs/token-efficiency.md` (purpose, columns: ticket, model, tokens/cost, files read, fix rounds, policy violations; DEV-18 adds the baseline vs graph-assisted comparison). Verify: the file exists with the table header. **[NFR-MNT-001]**

## 5. Live checks (D5)

- [ ] 5.1 Run live checks 2–5 by delegating to each agent on this branch (scratch changes reverted afterwards); ask the user to confirm check 1 (`/agents` list). Record each result in `docs/agents.md`. Verify: the checks table has a result per check. **[NFR-MNT-001, NFR-TST-001]**
- [ ] 5.2 Check the deny rules live: a Read of `pnpm-lock.yaml` is refused. Record the result in `docs/agents.md`. **[NFR-MNT-001]**

## 6. Quality gates

- [ ] 6.1 Run `pnpm build && pnpm lint && pnpm typecheck && pnpm test`. Verify: all exit 0. **[NFR-MNT-001]**
- [ ] 6.2 Before checkpoint B: ask the user to run `/cost` and paste the numbers; record the DEV-6 row in `docs/progress.md` and `docs/token-efficiency.md` ("not provided" if nothing is pasted). Verify: both rows exist. **[NFR-MNT-001]**
