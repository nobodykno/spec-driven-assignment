# CLAUDE.md — Team Task Tracker

## Source documents (read first)
- docs/FRS.md  requirements with IDs (FR-AUTH-001 ...)
- docs/SDS.md  architecture, data model, API, security, testing
- openspec/config.yaml  project rules for every OpenSpec change

## Workflow (every ticket, no exceptions)
Commands: `.claude/commands/opsx/` plus `create-pr`, `frs-ticket`, `save-context`. Their rules live in
`.claude/rules/` (index below). Lifecycle, gates and reasons: docs/workflow.md. One ticket per session.

| Step | Command |
|------|---------|
| Explore (fetch the Jira ticket first, read code and specs, list open questions) | `/opsx:explore DEV-9` |
| Propose (fetch ticket, blockers Done; proposal, specs, design, tasks, `delta-openapi.yaml`; Jira In Progress with approval) | `/opsx:propose DEV-9 auth` |
| **Gate 1: human approves the spec** (AskUserQuestion, recorded in `handoff.md` by apply); revise with | `/opsx:update <what to change>` |
| Apply (failing test first via `test-writer`, `reviewer` after each task group; one task = one commit) | `/opsx:apply dev-9-auth` |
| Verify (fresh session: gates, traceability, `reviewer` + code-review-graph) | `/opsx:verify dev-9-auth` |
| PR (scenario-to-test table, asks before pushing; Jira In Review + PR link with approval) | `/create-pr dev-9-auth` |
| **Gate 2: human reviews the code against the spec and merges** | |
| After merge, on a follow-up branch from `main`, via a small PR; Jira Done with approval | `/opsx:sync dev-9-auth`, `/opsx:archive dev-9-auth` |
| New requirement or change request | `/frs-ticket <request>` |
| Before `/clear` or `/compact` | `/save-context` |

- Never write code for a change without `gate-1 APPROVED` in its `handoff.md`; apply records it only from the user's answer.
- The `opsx` commands and `openspec-*` skills are project-customised (each carries a "Project-customised" comment):
  do not regenerate them with `openspec update`.
- Jira (Atlassian MCP) writes only with the user's approval, each asked separately. Ticket failures (MCP down, auth
  failed, ticket missing, malformed response) stop the command; never invent ticket data. Key map: docs/mcp-setup.md.
- Branches: `feature/{domain}/DEV-<n>-<short-name>` (domains: `.claude/rules/layout.md`). Change names: `dev-<n>-<short-name>`.
  Never commit to main directly; sync and archive reach main through a small follow-up PR.
- Commits: `type(area): <n.m> subject` + footer `Refs: DEV-N` (Jira key), e.g. `feat(auth): 2.1 add login endpoint`;
  test-first commits use type `test`. Areas: auth, tracker, gateway, web, shared, database, docker, workflow, docs.
  Header ≤ 72, lowercase imperative subject. **Claude stages one task's files, shows the files, the checks and the
  message, and runs `git commit` only after you reply `commit`.** Specs and production code never share a commit.
  Never bypass hooks with --no-verify. If a hook fails, fix the cause.
- Test titles start with the FRS ID: `it('FR-TASK-005: <scenario name>')`; spec scenario titles end with `[FR-TASK-005]`.

### Rule files (`.claude/rules/`)
- `layout.md`: layer paths, domains, task tags, branch and key conventions
- `propose-artifacts.md`: what `/opsx:propose` puts in each artifact, and the self-check
- `open-decisions.md`: the open-decision gate; no Open decision may reach specs or apply
- `handoff.md`: the append-only `openspec/changes/<name>/handoff.md` stage log and the full-loop orchestration
- `checkpoint.md`: the checkpoint after every task group and the append-only `review.md` evidence log
- `apply-delegation.md`: how apply briefs `test-writer` and `reviewer`, and the commit protocol

## Structure
- apps/web              React 19 + Vite + Tailwind + shadcn/ui + TanStack Query (:5173)
- services/api-gateway  Express 5, public entry (:4000), verifies JWT, proxies
- services/auth         Express 5 (:4001) register, login, refresh, logout, me
- services/tracker      Express 5 (:4002) projects, members, tasks, comments, activity
- packages/database     Sequelize + PostgreSQL 16 (ONLY package that imports sequelize)
- packages/shared       Zod schemas, types, error codes (@app/shared)

## Commands (repo root)
- Install:     pnpm install
- Dev:         pnpm dev
- Gates:       pnpm build && pnpm lint && pnpm typecheck && pnpm test
- One package: pnpm --filter <name> test
- Database:    pnpm db:up   (Docker Postgres on host port 5433)
- Format:      pnpm format
- Browser e2e: pnpm test:e2e   (Playwright; app must be running, see design D14)

## Code rules
- Coding guidelines: follow docs/CODING_GUIDELINES.md (naming, style, structure, TypeScript, errors). `pnpm lint` enforces them.
- Layering: routes → controllers → services → @app/database models
- app.ts (Express app) separate from index.ts (listen) so Supertest can test `app`
- Validate all input with Zod schemas from @app/shared
- Errors: { error: { code, message, details? } } with codes from SDS §6.4
- Non-members get 404; wrong role gets 403
- TypeScript strict; no `any`, no @ts-ignore
- Test names start with the FRS ID: it('FR-TASK-005: ...')
- Pin exact versions; no `latest`; no dependency outside the approved proposal

## Git hooks (husky, installed by `pnpm install`)
- pre-commit: `pnpm lint-staged` (ESLint --fix + Prettier on staged files), then
  `scripts/check-staged-secrets.mjs` (blocks .env files, private keys, real JWT_SECRET, AWS keys)
- commit-msg: commitlint (commit convention above)
- pre-push: pnpm build && pnpm lint && pnpm typecheck && pnpm test
- Never bypass hooks with --no-verify. If a hook fails, fix the cause.

## Claude Code setup (details: docs/claude-setup.md)
- Layer rules: services/CLAUDE.md, apps/web/CLAUDE.md
- Subagents: implementer (manual only), test-writer, reviewer, coordinator (.claude/agents/, details: docs/agents.md);
  each has an agent-scoped guard hook
- Skills: zod-contract, express-endpoint, sequelize-migration (.claude/skills/)
- Hooks: PreToolUse guard blocks rm -rf, force push, push to main, --no-verify, printenv/env,
  docker compose down -v and any .env access; PostToolUse formats and lints every edited file.
  A blocked call means: change the approach, do not work around the hook.

## Token efficiency (mandatory)
- Follow docs/token-policy.md in every session and subagent: grep then read line ranges (never
  whole FRS/SDS or folders), compact test output, re-run only failing files, one ticket per session.
- Sonnet by default; Opus only for DEV-9 and DEV-20 after telling the user to switch with /model.
- Before CHECKPOINT B ask the user for /cost and record it in docs/token-efficiency.md.

## Never
- Read, print or commit .env files or secrets
- Use npm or yarn
- Push to main or force-push
- Edit an applied migration