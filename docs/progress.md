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

### Checks run

- Unit/integration: `pnpm test` (shared 29, database 1, gateway 6, auth 5, tracker 5, web 5, scripts 79).
- Docker: `pnpm db:up` healthy on 5433; `docker compose up --build -d --wait` healthy; curl checks
  for 7.4 and the database-down check for 7.5 (503 in 0.327 s, back to 200 after restart).
- Browser: Playwright `E2E_EXPECT=online|offline pnpm test:e2e`, both passed.
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

### Human interventions

- Approvals in chat: initial plan, Git hooks scope, Playwright + guidelines scope.
- Permission/settings decisions: settings file location, narrowing curl deny / ask overrides, Playwright as a DEV-1 dependency.
- Manual checks by the user: 7.4 stack curl checks and 7.5 database-down check (before curl was allowed).
- Commits on `main` approved by the user: `2922b90` (Jira key mapping docs).
