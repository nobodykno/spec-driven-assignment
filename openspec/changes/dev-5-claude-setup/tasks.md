# Tasks: DEV-5 Claude Code setup

Rules for every task:
- Test first, watch it fail, then implement.
- Test names start with the requirement ID, e.g. `it('NFR-SEC-005: ...')`.
- One commit per task: `type(area): <n.m> <summary>` with the footer `Refs: DEV-5`. The area for this
  ticket is `workflow` (`docs` for documentation-only tasks).

## 1. Workflow fixes (D9)

- [x] 1.1 Change `.claude/commands/sdd/{propose,apply,verify,ship,run}.md` to use `$0` for the Jira key and `$1` for the change name, and reorder `run.md` stage d to archive on the feature branch before the PR. Remove the "archive commit on main" exception from `CLAUDE.md`. Verify: `grep -n '\$2' .claude/commands/sdd/*.md` prints nothing, and `run.md` stage d contains no `git push origin main`. **[NFR-MNT-001]**

## 2. Lint and test scope for hooks (D1)

- [x] 2.1 Lint and format `.claude/hooks/`. In `eslint.config.js` and `.prettierignore`, replace `.claude/` with `.claude/*` plus an exception for `.claude/hooks/`, and add `vitest run --dir .claude/hooks` to the root `test` script. Verify: `pnpm lint` and `pnpm test` exit 0. **[NFR-MNT-001]**

## 3. PreToolUse guard (D2, D3)

- [x] 3.1 Write `.claude/hooks/pre-tool-guard.test.mjs` first. One test per spec scenario:
  - `NFR-SEC-005: blocks recursive forced delete`
  - `NFR-SEC-005: blocks force push`
  - `NFR-SEC-005: blocks push to main`
  - `NFR-MNT-001: blocks hook bypass`
  - `NFR-SEC-005: blocks environment dump`
  - `NFR-SEC-005: blocks docker volume removal`
  - `NFR-SEC-005: allows ordinary commands`
  - `NFR-SEC-005: blocks .env via file tools`
  - `NFR-SEC-005: blocks .env from the shell`
  - `NFR-SEC-005: allows .env.example`
  - `NFR-SEC-005: blocks chained dangerous commands`
  - `NFR-SEC-005: fails closed on malformed input`
  - a CLI test that pipes a real hook payload and asserts exit code 2 and the stderr message
  - verify: `pnpm exec vitest run --dir .claude/hooks` fails
- [x] 3.2 Implement `.claude/hooks/pre-tool-guard.mjs` (`evaluateToolCall` plus the CLI wrapper). Verify: `pnpm exec vitest run --dir .claude/hooks` passes. **[NFR-SEC-005, NFR-MNT-001]**

## 4. PostToolUse formatter (D4)

- [x] 4.1 Write `.claude/hooks/post-edit-format.test.mjs` first:
  - `NFR-MNT-001: formats an edited ts file`: temp file under the repo, run the CLI with a hook payload, then check for single quotes and semicolons
  - `NFR-MNT-001: reports unfixable lint errors`: `any` → exit 2 naming `no-explicit-any`
  - `NFR-MNT-001: leaves other files untouched`: `.md` file and an `openspec/` path → exit 0, content unchanged
  - `NFR-MNT-001: ignores paths outside the project`
  - verify: the tests fail
- [x] 4.2 Implement `.claude/hooks/post-edit-format.mjs`. Verify: `pnpm exec vitest run --dir .claude/hooks` passes. **[NFR-MNT-001]**

## 5. Settings checker and settings (D5, D6)

- [x] 5.1 Write `scripts/check-claude-settings.test.mjs` first:
  - `NFR-MNT-001: current settings pass`: loads the real file
  - `NFR-MNT-001: rejects malformed rules`: `:*` in the middle, unbalanced parentheses
  - `NFR-MNT-001: rejects a rule in two lists`
  - `NFR-MNT-001: rejects an unknown defaultMode`
  - `NFR-MNT-001: rejects a missing hook script`
  - verify: the tests fail
- [x] 5.2 Implement `scripts/check-claude-settings.mjs` and add it to `pnpm lint` (`check:claude-settings`). Update `.claude/settings.json` per D5: `defaultMode`, `hooks`, and the pnpm ask rules. Verify: `pnpm exec vitest run --dir scripts` and `pnpm lint` pass. **[NFR-SEC-005, NFR-MNT-001]**
- [x] 5.3 Live hook check in a new Claude Code session on this branch. Through the agent, try:
  - `rm -rf tmp-guard-check`
  - `git push --force`
  - `git push origin main`
  - `printenv`
  - Read on `.env`
  - `cat services/auth/.env`
  - `git commit --no-verify`
  
  Then write a badly formatted `.ts` scratch file. Record each result: blocked message, exit code 2, and that the scratch file was formatted. Verify: the results are recorded in `docs/claude-setup.md`. **[NFR-SEC-005, NFR-MNT-001]**

## 6. Skills and instructions (D7, D8)

- [x] 6.1 Add `.claude/skills/zod-contract/SKILL.md`. Demo it on a scratch branch with a sample schema plus tests, check the result against the checklist, run `pnpm --filter @app/shared test`, then delete the branch. Verify: the demo result is recorded. **[NFR-MNT-001]**
- [x] 6.2 Add `.claude/skills/express-endpoint/SKILL.md`. Demo it on a scratch branch with `GET /api/v1/ping` in tracker (schema, test first, route/controller/service), check against the checklist, run the gates, then delete the branch. Verify: the demo result is recorded, including the checklist catching a controller that queries a model. **[NFR-MNT-001]**
- [x] 6.3 Add `pnpm db:migrate:undo` (root and `@app/database` `migrate:undo`) and `.claude/skills/sequelize-migration/SKILL.md`. Demo it on a scratch branch: a throwaway table, `pnpm db:migrate`, check the table exists (`docker compose exec postgres psql`), `pnpm db:migrate:undo`, check it is gone, then delete the branch. Verify: the demo result is recorded. **[NFR-MNT-001]**
- [x] 6.4 Add `services/CLAUDE.md` and `apps/web/CLAUDE.md` (D8), and a "Claude Code setup" section in the root `CLAUDE.md` that references them, the hooks, the skills and `docs/claude-setup.md`. Verify: each nested file exists and is referenced, and is checked line by line against `docs/CODING_GUIDELINES.md` and SDS §3.1 for contradictions (none). **[NFR-MNT-001]**

## 7. Docs (D1–D9)

- [x] 7.1 Write `docs/claude-setup.md` with these sections:
  - instructions (root and nested)
  - permissions table (allow/ask/deny and why)
  - hooks (rules, protocol, limits)
  - skills (purpose, demo result)
  - settings checker
  - test results: automated counts plus the 5.3 live results
  - recommended `settings.local.json`
  - how to disable the hooks
  
  Verify: every acceptance criterion of DEV-5 maps to a section with a recorded result. **[NFR-SEC-005, NFR-MNT-001]**

## 8. Quality gates

- [ ] 8.1 Run `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test`. Every command exits 0. **[NFR-MNT-001]**
- [ ] 8.2 Run `openspec validate dev-5-claude-setup --strict`, and check that every spec scenario maps to a test or to a recorded 5.3/6.x check. Verify: validate exits 0. **[all]**

## Workflow follow-up

- `/sdd:verify` (reviewer subagent, traceability) → CHECKPOINT B → on `commit`: archive on the branch, push, PR, merge (new stage d order from 1.1).
- Ask the human once to open `/permissions` and confirm there are no syntax warnings (acceptance criterion).
