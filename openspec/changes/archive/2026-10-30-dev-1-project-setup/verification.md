# Verification: DEV-1 Project setup (`dev-1-project-setup`)

- **Ticket:** DEV-1 (assignment ID DEV-1001), source: live MCP (Jira `paramjitjena6.atlassian.net`)
- **Approvals:** Paramjit Jena — 2026-10-29 (initial), 2026-10-30 13:30 IST (Git hooks, via chat),
  2026-10-30 14:08 IST (Playwright + coding guidelines, via chat)
- **Verified:** 2026-10-30 on `feature/DEV-1-project-setup`
- **Tasks:** 42/42 complete (`openspec instructions apply`); `openspec validate --strict` passes

## Quality gates

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | pass |
| `pnpm build` | pass |
| `pnpm lint` (versions, file names, ESLint, Prettier) | pass — 0 errors, 7 warnings, all `no-console`: three `index.ts` startup messages and four server-side error logs (accepted until the logger in DEV-1006, design D15) |
| `pnpm typecheck` (workspaces + `tsconfig.e2e.json`) | pass |
| `pnpm test` | pass — 98 script tests + shared 29, database 1, gateway 8, auth 6, tracker 6, web 5 |
| `pnpm test` with Postgres stopped | pass |
| `pnpm test:e2e` (Playwright, against `pnpm dev`) | pass — online and offline runs, screenshots in `docs/evidence/DEV-1/` |
| pre-push hook | blocks a failing test (exit 1), passes when clean |

## Traceability

Automated tests are named with the ID. "Manual" checks were run in the session and are recorded in
`docs/progress.md` (and in the commit message of the task named).

### service-health (FR-SYS-001, FR-SYS-002)

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| FR-SYS-001 | Gateway health returns ok | `services/api-gateway/src/app.test.ts` : FR-SYS-001: GET /health returns 200 ok | pass |
| FR-SYS-001 | Auth health ok when DB reachable | `services/auth/src/app.test.ts` : FR-SYS-001: GET /health returns 200 ok when the database is reachable | pass |
| FR-SYS-001 | Tracker health ok when DB reachable | `services/tracker/src/app.test.ts` : same name | pass |
| FR-SYS-001 | Unknown path → 404 | auth/tracker `app.test.ts` : FR-SYS-001: unknown path returns 404 NOT_FOUND | pass |
| FR-SYS-001 | Auth 503 when DB down | `services/auth/src/app.test.ts` : FR-SYS-001: GET /health returns 503 error when the database is down; manual 7.5 (503 in 0.327 s) | pass |
| FR-SYS-001 | Tracker 503 when DB down | `services/tracker/src/app.test.ts` : same name | pass |
| FR-SYS-001 | Health check does not hang | `packages/database/src/health.test.ts` : FR-SYS-001: checkDatabase returns false within 3s when the database is unreachable | pass |
| FR-SYS-001 | Recovers when DB comes back | auth/tracker `app.test.ts` : FR-SYS-001: GET /health recovers once the database is reachable again; manual 7.5 | pass |
| FR-SYS-001 | Gateway health ok while auth down | `services/api-gateway/src/app.test.ts` : FR-SYS-001: GET /health is 200 while auth is down | pass |
| FR-SYS-002 | Versioned gateway health ok | `app.test.ts` : FR-SYS-002: GET /api/v1/health returns 200 ok | pass |
| FR-SYS-002 | Unknown versioned path → 404 | `app.test.ts` : FR-SYS-002: unknown /api/v1 path returns 404 NOT_FOUND | pass |
| FR-SYS-001 | Auth route while auth down → 503 | `proxy.test.ts` : FR-SYS-001: /api/v1/auth/* returns 503 SERVICE_UNAVAILABLE without internal details when auth is unreachable | pass |
| FR-SYS-001 | Auth route forwarded | `proxy.test.ts` : FR-SYS-001: /api/v1/auth/health is forwarded to auth /health; manual 7.4 | pass |

### web-api-status (FR-SYS-002)

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| FR-SYS-002 | API online | `apps/web/src/app.test.tsx` : FR-SYS-002: shows API: online when health is ok; `e2e/web-api-status.spec.ts` (online) | pass |
| FR-SYS-002 | API error status | `app.test.tsx` : FR-SYS-002: shows API: offline on 503 | pass |
| FR-SYS-002 | API unreachable | `app.test.tsx` : FR-SYS-002: shows API: offline on network error | pass |
| FR-SYS-002 | Unexpected body | `app.test.tsx` : FR-SYS-002: shows API: offline on unexpected body | pass |
| FR-SYS-002 | Loading state | `app.test.tsx` : FR-SYS-002: shows loading while pending | pass |
| FR-SYS-002 | Dev server proxies to gateway | `e2e/web-api-status.spec.ts` : FR-SYS-002: home page shows API: online (via Vite proxy); `docs/evidence/DEV-1/web-api-online.png` | pass |
| FR-SYS-002 | Gateway not running | `e2e/web-api-status.spec.ts` with `E2E_EXPECT=offline` after stopping the gateway; `web-api-offline.png` | pass |

### local-environment (NFR-OPS-001)

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-OPS-001 | Clean install succeeds | manual 12.1: `pnpm install --frozen-lockfile` exit 0 | pass |
| NFR-OPS-001 | Stale lockfile fails install | manual 12.2: `ERR_PNPM_OUTDATED_LOCKFILE` | pass |
| NFR-OPS-001 | Database healthy | manual 7.2: `pnpm db:up` healthy, `pg_isready` on 5433 | pass |
| NFR-OPS-001 | Data survives restart | manual 12.2: row read back after `docker compose stop/start postgres` | pass |
| NFR-OPS-001 | Port 5432 left free | manual 12.2: nothing listens on 5432; compose maps 5433 | pass |
| NFR-OPS-001 | Full stack healthy | manual 7.4: `docker compose up --build -d --wait`, curl 200 on 4000 and 8080 | pass |
| NFR-OPS-001 | Internal services not published | manual 7.4: `curl localhost:4001` refused (exit 7) | pass |
| NFR-OPS-001 | Image build fails loudly | manual 7.3: the esbuild build refusal failed `docker build` (no `\|\| true`), fixed via `allowBuilds` | pass |
| NFR-OPS-001 | Pinned repo passes version check | `scripts/check-versions.test.mjs` : NFR-OPS-001: accepts exact versions and workspace protocol (+ image cases); `pnpm check:versions` exit 0 | pass |
| NFR-OPS-001 | Caret range rejected | `check-versions.test.mjs` : NFR-OPS-001: rejects floating range %s | pass |
| NFR-OPS-001 | Floating Docker tag rejected | `check-versions.test.mjs` : NFR-OPS-001: rejects floating FROM image / compose image %s | pass |

### quality-gates (NFR-MNT-001)

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-MNT-001 | All gates pass on clean checkout | manual 12.1 | pass |
| NFR-MNT-001 | Failing test fails the gate | manual 12.1: temporary failing test → `pnpm test` / pre-push exit 1 | pass |
| NFR-MNT-001 | Tests run without a database | manual 12.1: `pnpm test` with Postgres stopped | pass |
| NFR-MNT-001 | Strict compile passes | `pnpm typecheck` exit 0 | pass |
| NFR-MNT-001 | Type error fails typecheck | manual 12.2: implicit `any` → TS7006, exit 2 | pass |
| NFR-MNT-001 | Clean code passes lint | `pnpm lint` exit 0; `scripts/lint-rules.test.mjs` : clean guideline-style code passes | pass |
| NFR-MNT-001 | Explicit any rejected | `lint-rules.test.mjs` : NFR-MNT-001: rejects explicit any and ts-ignore | pass |
| NFR-MNT-001 | ts-ignore rejected | same test | pass |
| NFR-MNT-001 | Unformatted file rejected | `pnpm lint` runs `prettier --check` (manual 1.4) | pass |
| NFR-MNT-001 | Guideline-compliant code passes | `pnpm lint` 0 errors after 11.4 | pass |
| NFR-MNT-001 | Style violations rejected | `lint-rules.test.mjs` : rejects double quotes and missing semicolons; rejects == and if without braces | pass |
| NFR-MNT-001 | Structural violations rejected | `lint-rules.test.mjs` : rejects nesting deeper than 3 and complexity over 10 | pass |
| NFR-MNT-001 | TS and export violations rejected | `lint-rules.test.mjs` : rejects a missing return type…; rejects a default export outside config files | pass |
| NFR-MNT-001 | Non-kebab file name rejected | `scripts/check-file-names.test.mjs` : rejects a file name that is not kebab-case; rejects a folder name… | pass |
| NFR-MNT-001 | Soft limits warn | `lint-rules.test.mjs` : warns on console and on functions over 30 lines | pass |
| NFR-MNT-001 | Unexpected error sanitised | auth/tracker `app.test.ts` : NFR-MNT-001: unexpected error returns 500 INTERNAL_ERROR without stack | pass |
| NFR-MNT-001 | Unknown error code rejected | `packages/shared/src/schemas/common.test.ts` : NFR-MNT-001: rejects an unknown error code | pass |

### git-hooks (NFR-MNT-001, NFR-SEC-005)

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-MNT-001 | Hooks active after install | manual 9.1: `git config core.hooksPath` = `.husky/_` | pass |
| NFR-MNT-001 | Install without Git succeeds | manual 7.3: Docker build log `HUSKY=0 skip install`, install exit 0 | pass |
| NFR-MNT-001 | Valid commit message accepted | `scripts/commitlint.test.mjs` : accepts feat(auth) with Refs: DEV-9; every area scope | pass |
| NFR-MNT-001 | No scope rejected | `commitlint.test.mjs` : rejects a message without a scope | pass |
| NFR-MNT-001 | Non-area scope rejected | `commitlint.test.mjs` : rejects a scope that is not an area | pass |
| NFR-MNT-001 | Missing Refs footer rejected | `commitlint.test.mjs` : rejects a missing Refs footer, including on main | pass |
| NFR-MNT-001 | Type/header/case/body rejected | `commitlint.test.mjs` : rejects an unknown type, a header over 72, … | pass |
| NFR-SEC-005 | Ordinary files pass | `scripts/check-staged-secrets.test.mjs` : allows ordinary source files; allows .env.example; placeholders | pass |
| NFR-SEC-005 | Staged .env rejected | `check-staged-secrets.test.mjs` : rejects .env, nested .env and .env.production; manual 9.3/9.6 | pass |
| NFR-SEC-005 | Secret content rejected | `check-staged-secrets.test.mjs` : private key, JWT_SECRET, AWS keys; findings never contain the secret value | pass |
| NFR-MNT-001 | Auto-fixable problems fixed | manual 9.6: badly formatted file fixed and committed | pass |
| NFR-MNT-001 | Unfixable lint error rejected | manual 9.6: `const x: any` commit rejected | pass |
| NFR-MNT-001 | Passing gates allow push | manual 12.1: `sh .husky/pre-push` exit 0 (real push at CHECKPOINT B) | pass |
| NFR-MNT-001 | Failing tests block push | manual 12.1: pre-push exit 1 with a failing test | pass |

## Requirements with no test

None. Every FRS/NFR ID in this change (FR-SYS-001, FR-SYS-002, NFR-OPS-001, NFR-MNT-001,
NFR-SEC-005) has automated tests; Docker, browser and hook scenarios also have recorded manual checks.

## Reviewer findings

Independent `reviewer` subagent, round 1 (verdict: CHANGES REQUIRED).

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| high | `.claude/commands/sdd/apply.md:13-21` | The agent may write the approval lines after the user's chat reply `approved`; not in the proposal | **Accepted, pending human confirmation at CHECKPOINT B.** The user asked for this rule in chat (2026-10-30). It is a workflow change, not DEV-1 product scope |
| high | `CLAUDE.md:17-18,:61`, `.claude/commands/sdd/run.md` | Main-branch archive commit/push exception; `/sdd:run` automates merge, archive, push to main and Jira Done | **Accepted, pending human confirmation at CHECKPOINT B.** The user asked for this in chat (checkpoint-B flow) |
| medium | `.claude/settings.json` | Shared permission file not in the proposal | **Accepted, pending human confirmation.** The user asked for it and approved it with "commit" (b6071fd) |
| medium | `scripts/check-staged-secrets.mjs:8` | `JWT_SECRET` missed in `ENV`, YAML and JSON forms | **Fixed** ddf78a3 (+ tests) |
| medium | `services/*/src/middleware/error-handler.ts`, `services/api-gateway/src/app.ts:15` | Unknown errors and proxy errors swallowed | **Fixed** ced1b81, 2863734, 714a88a (logged server-side; response unchanged; tests) |
| low | `apps/web/src/app.tsx:25`, `packages/database/src/index.ts:28` | `.then` chains (guidelines) | **Fixed** be672f8, 7a3bf97 |
| low | `services/auth/src/app.ts:12` | `express.json` parse errors become 500 | **Accepted, deferred to DEV-1006.** Matches design D4; DEV-1006 adds the first request bodies and maps `entity.parse.failed` / `entity.too.large` |
| low | `.gitignore:8-10` | `.env.production` etc. not ignored | **Fixed** ddf78a3 |
| low | `playwright.config.ts`, `e2e/` | Not type-checked | **Fixed** 6f5bc45 (`tsconfig.e2e.json` in `pnpm typecheck`) |
| low | `pnpm-lock.yaml:7-13` | `packageManagerDependencies` specifier `^11.20.0` | **Accepted.** Written by pnpm 11 itself to manage its own version; the resolved version is the exact 11.28.9 that `packageManager` pins. Generated lockfile content is not hand-edited |
| low | `lint-staged.config.mjs:3` | `.cjs` not linted on commit | **Fixed** ddf78a3 |
| low | `services/api-gateway/src/app.test.ts:21` | Duplicate health test; no gateway `/healthz` 404 test | **Fixed** 714a88a |
| low | `design.md:178`, `tasks.md:153` | Stale `COMMITLINT_BRANCH` wording | **Fixed** 2e0e1b1 |
| low | `docs/progress.md` | Not listed in the proposal | **Accepted.** The user asked for a running progress log (feeds DEV-1018) |

Not covered by a scenario (reviewer note): the requirement text mentions React hooks rule violations; the
`react-hooks` recommended config is enabled for `apps/web` but has no dedicated test. Accepted as low.

Round 2 (verdict: CHANGES REQUIRED). It confirmed all round-1 fixes.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `scripts/check-staged-secrets.mjs:10` | Single-line JSON / inline YAML missed; JSON placeholder test did not reach the check | **Fixed** d1a31db (+ tests) |
| low | same | Legacy `ENV JWT_SECRET value` form missed | **Fixed** d1a31db |
| low | service test files | Spies not restored when a test fails | **Fixed** 9f5c3c4, f6f44cb, 1436c02 (`restoreMocks: true`) |
| low | error handlers | Full error objects logged; may contain driver details | **Accepted until DEV-1006** (pino with redacting serializers) |
| low | auth/tracker logging tests | Inconsistent ID tag | **Fixed** (now FR-SYS-001) |

Round 3 (verdict: **APPROVE**). It confirmed all round-2 fixes.

| Severity | File:line | Issue | Status |
| --- | --- | --- | --- |
| medium | `scripts/check-staged-secrets.mjs:11` | A Zod env schema entry or a `process.env` reference for the JWT secret in TS code was flagged as a secret | **Fixed** d50f595 (in code files only quoted literals count; tests for Zod schema, `process.env`, quoted literal) |
| low | `scripts/check-staged-secrets.mjs:13` | Quoted / lowercase legacy `ENV` value | **Fixed** d50f595 |
| low | same | The JWT secret passed via `docker run -e`, inside a YAML/JSON list, or after another assignment on the same line is not detected | **Accepted.** The check targets the obvious cases (design D13 Non-Goals: no full secret scanning); recorded for DEV-1017's security review |
| low | `scripts/check-staged-secrets.test.mjs` | Allow-cases need paired reject-cases | **Fixed** d50f595 (quoted literal in code, quoted legacy `ENV`) |

## Result

**READY FOR PR.** All gates pass, every FRS/NFR ID has tests, and no critical or high finding is unresolved
in the product code. Three governance findings (chat approval rule, main-branch archive
exception with `/sdd:run`, shared `.claude/settings.json`) are user-requested workflow changes
outside the approved DEV-1 scope. They are listed above for the human's decision at CHECKPOINT B.

## Deviations from the spec or SDS

| Deviation | Reason |
| --- | --- |
| `@mindfiredigital/eslint-plugin-hub` not used | Its postinstall hangs `pnpm install` on a stdin prompt (could run `npm init @eslint/config@latest`). Planned fallback applied: `@typescript-eslint/naming-convention` + `scripts/check-file-names.mjs` (design D15, `docs/versions.md`). |
| `docs/CODING_GUIDELINES.md` written by the agent | No guideline file existed; it records the rules given in chat and says so. |
| `console.log` remains in three `index.ts` files (lint warnings) | The logger (pino) arrives in DEV-1006 (SDS §4); recorded in D15 and the guidelines. |
| `pnpm-workspace.yaml` `allowBuilds` replaces `onlyBuiltDependencies` | pnpm 11 ignores the old key; found when the Docker build failed (7.3). |
| ESLint 10, not 9 | ESLint 10.13.0 was already approved in 1.3; flat config is the same. |
