# Progress log

Running log per ticket: stage, commits, checks, problems and human interventions. Feeds
`docs/retrospective.md` (DEV-1018).

## DEV-1 (DEV-1001) Project setup — change `dev-1-project-setup`

Branch `feature/DEV-1-project-setup`.

| Date (IST) | Stage | What happened |
| --- | --- | --- |
| 2026-10-29 | Propose / approve | Change created from Jira DEV-1 via MCP; approved by Paramjit Jena. |
| 2026-10-29 | Apply 1–6 | Root tooling, shared, database, auth, gateway, tracker (16 tasks, test-first). |
| 2026-10-30 | Backlog | 17 Jira tickets (DEV-5…DEV-21 = DEV-1002…1018) and 46 "is blocked by" links created via MCP after approval. `docs/tickets/` fixture removed. |
| 2026-10-30 13:30 | Re-approve | Scope extended with Git hooks (`/opsx:update`); approved in chat. |
| 2026-10-30 | Apply 9 | husky 9.1.7, lint-staged 17.6.0, commitlint 21.2.4, staged-secret check; hooks verified on a scratch branch. |
| 2026-10-30 | Apply 7 | Exact Docker tags, Postgres on 5433, non-root Dockerfiles, full compose stack. |
| 2026-10-30 | Apply 8.1–8.2 | Web component tests (5) and abortable health check. |
| 2026-10-30 14:08 | Re-approve | Scope extended with Playwright (8.3) and coding-guideline enforcement (group 11); approved in chat. |
| 2026-10-30 | Apply 8.3 | Playwright headless check online/offline against `pnpm dev`; screenshots in `docs/evidence/DEV-1/`. |
| 2026-10-30 | Apply 11 | Guidelines doc, ESLint/Prettier rules with tests, code fixed (lint 0 errors), VS Code settings, area-scope commit convention. |
| 2026-10-30 | Apply 10 | `docs/versions.md`, old `project-setup` change removed, Git hooks section in CLAUDE.md, FRS row. |
| 2026-10-30 | Apply 12 | All gates from a frozen install; manual scenario checks (restart, port, typecheck, lockfile). |
| 2026-10-30 | Verify | Reviewer subagent, 3 rounds: CHANGES REQUIRED → CHANGES REQUIRED → APPROVE. 14 + 5 + 4 findings; code findings fixed in 14 commits; 3 governance findings escalated to the human. Gates: lint 0 errors, 98 script tests + 55 package tests. |
| 2026-10-30 14:55 | Ship | User replied `commit`. Pushed (pre-push gates passed), PR #1 opened and merged (023d256), change archived and specs synced (5a8daca, +21 requirements), `main` pushed, feature branch deleted, Jira DEV-1 commented and moved to Done. |

### Checks run

- Unit/integration: `pnpm test` (shared 29, database 1, gateway 6, auth 5, tracker 5, web 5, scripts 79).
- Docker: `pnpm db:up` healthy on 5433; `docker compose up --build -d --wait` healthy; curl checks
  for 7.4 and the database-down check for 7.5 (503 in 0.327 s, back to 200 after restart).
- Browser: Playwright `E2E_EXPECT=online|offline pnpm test:e2e`, both passed.
- Scenario checks (12.2): table row survived a Postgres restart; nothing listens on 5432; an
  implicit `any` fails `pnpm typecheck` (TS7006); a stale lockfile fails `pnpm install --frozen-lockfile`
  (`ERR_PNPM_OUTDATED_LOCKFILE`); gates pass with Postgres stopped.
- Hooks: formatting fix committed; `any`, `feat: x`, staged `.env` rejected; pre-push blocked a push.

### Problems and fixes

| Problem | Fix |
| --- | --- |
| `pnpm-workspace.yaml` `onlyBuiltDependencies` ignored by pnpm 11; esbuild build refused in Docker | Switched to `allowBuilds: { esbuild: true }` (7.3). |
| Docker Hub API access denied | Read versions from the moving-tag images, confirmed exact tags with `docker pull` (7.1). |
| `docker run` and `curl` not permitted in the session | User ran the 7.4/7.5 checks; later `.claude/settings.json` allowed localhost curl and docker compose. |
| `@mindfiredigital/eslint-plugin-hub` postinstall prompts on stdin and hung `pnpm install` (twice; `allowBuilds: false` did not help) | Skipped per the planned fallback: `@typescript-eslint/naming-convention` + `scripts/check-file-names.mjs` (11.3). |
| `eslint-config-prettier` turns off `curly` as well as `semi`/`quotes` | Re-enabled all three after it (11.3). |
| `docs/CODING_GUIDELINES.md` did not exist | Written from the rules given in chat, labelled as such (11.1). |
| Reviewer: JWT_SECRET check missed ENV/YAML/JSON forms, then over-matched TypeScript | Widened in two rounds, then made quote-aware for code files; tests for every form. |
| Reviewer: swallowed errors, `.then` chains, e2e not type-checked | Logged server-side, async/await, `tsconfig.e2e.json` in the typecheck gate. |
| Reviewer subagent status looked stale between turns | The agent only progressed while the session was active; waiting inside a turn let it finish. |

### Human interventions

- Approvals in chat: initial plan, Git hooks scope, Playwright + guidelines scope.
- Permission/settings decisions: settings file location, narrowing curl deny / ask overrides, Playwright as a DEV-1 dependency.
- Manual checks by the user: 7.4 stack curl checks and 7.5 database-down check (before curl was allowed).
- Commits on `main` approved by the user: `2922b90` (Jira key mapping docs).

## DEV-5 (DEV-1002) Claude Code setup — change `dev-5-claude-setup`

Branch `feature/DEV-5-claude-setup`.

| Date (IST) | Stage | What happened |
| --- | --- | --- |
| 2026-10-30 | Propose | Ticket fetched via MCP; `/sdd:run` rendered the change name as the ticket (`$1`/`$2` vs `$0`/`$1`), fixed in task 1.1. |
| 2026-10-30 15:01 | Approve | Approved in chat, including archive-before-merge so the agent never pushes to main. |
| 2026-10-30 | Apply 1–8 | sdd fixes; guard + formatter hooks (test-first); settings checker; live hook check (hooks active without restart); 3 skills, each demoed on a scratch branch; nested CLAUDE.md; docs/claude-setup.md. |
| 2026-10-30 | Verify | Reviewer subagent, 3 rounds, each CHANGES REQUIRED (18 + 10 + 8 findings). All fixed or accepted; round-3 fixes not re-reviewed (3-round cap). Gates: lint 0 errors, 260 root + 55 package tests. |
| 2026-10-30 15:46 | Ship | User replied `commit` (accepting the un-re-reviewed round-3 fixes). Archived on the branch (68ab6d7, +9 requirements), pushed through the pre-push gates, PR #2 merged (fbb193d), branch deleted, nothing pushed to `main` directly; Jira DEV-5 commented and moved to Done. `/permissions` check still open for the human. |

### Problems and fixes

| Problem | Fix |
| --- | --- |
| Command arguments are `$0`-based in this Claude Code version | All `sdd` commands use `$0`/`$1` (1.1). |
| Ticket requires blocking pushes to main; `/sdd:run` pushed the archive commit to main | Archive moved into the PR before merge; CLAUDE.md exception removed (1.1). |
| Format hook flagged the `Sequelize` parameter in the migration demo | `naming-convention` off for migrations/seeders (6.3). |
| Pattern guard had many ordinary-shell bypasses (review rounds 1–3) | Raw-text scan, recursive substitution/shell checks, wrapper handling; 132 guard tests. |
| The guard blocked its own author: heredocs and commit messages that mention env-file names or HUSKY | Edit/Write tool for such text, reworded messages; quoted message text ignored for HUSKY; remaining false positives documented. |
| Local `settings.local.json` and machine settings block reading `.env.example` | Documented as recommended local settings; committed config allows it. |

### Human interventions

- Approval in chat (plan, decision 1: archive before merge; decision 2: no broad docker ask rule).
- Pending: one look at `/permissions` (acceptance criterion) and the decision on the un-re-reviewed round-3 fixes.

