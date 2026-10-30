# Verification: DEV-5 Claude Code setup (`dev-5-claude-setup`)

- **Ticket:** DEV-5 (assignment ID DEV-1002), source: live MCP (Jira `paramjitjena6.atlassian.net`)
- **Approval:** Paramjit Jena, via chat, 2026-10-30 15:01 IST
- **Verified:** 2026-10-30 on `feature/DEV-5-claude-setup`
- **Tasks:** 16/16 complete; `openspec validate dev-5-claude-setup --strict` passes

## Quality gates

| Check | Result |
| --- | --- |
| `pnpm build` | pass |
| `pnpm lint` (versions, file names, Claude settings, ESLint, Prettier) | pass: 0 errors, 7 accepted `no-console` warnings (unchanged from DEV-1) |
| `pnpm typecheck` | pass |
| `pnpm test` | pass: 260 root tests (scripts + `.claude/hooks`) + 55 package tests (final run after review round 3) |
| `pnpm install --frozen-lockfile` | not re-run: `pnpm-lock.yaml` is unchanged vs `main`, and `pnpm install` is now an ask command |

## Traceability

Tests are named with the requirement ID. "Live" = run through Claude Code in this session (task 5.3).
"Demo" = skill invoked on a scratch branch (tasks 6.1–6.3). Details: `docs/claude-setup.md`.

### agent-guardrails

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-SEC-005 | Recursive forced delete blocked | `.claude/hooks/pre-tool-guard.test.mjs` : NFR-SEC-005: blocks recursive forced delete (5 forms); live `rm -fr` | pass |
| NFR-SEC-005 | Force push blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks force push (5 forms); live `--force-with-lease` | pass |
| NFR-SEC-005 | Push to main blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks push to main (refspecs + plain push on main); live `git push origin main` | pass |
| NFR-MNT-001 | Hook bypass blocked | `pre-tool-guard.test.mjs` : NFR-MNT-001: blocks hook bypass; live `git commit --no-verify` | pass |
| NFR-SEC-005 | Environment dump blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks environment dump; live `true && printenv` | pass |
| NFR-SEC-005 | Docker volume removal blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks docker volume removal; live `docker compose down --volumes` | pass |
| NFR-SEC-005 | Ordinary commands allowed | `pre-tool-guard.test.mjs` : NFR-SEC-005: allows ordinary commands (11 forms); the whole session ran normally with the hook active | pass |
| NFR-SEC-005 | .env via file tools blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks .env via file tools (8 cases); live attempts stopped earlier by the permission layer | pass |
| NFR-SEC-005 | .env from the shell blocked | `pre-tool-guard.test.mjs` : NFR-SEC-005: blocks .env from the shell (7 forms); live `cat services/auth/.env` | pass |
| NFR-SEC-005 | .env.example stays readable | `pre-tool-guard.test.mjs` : NFR-SEC-005: allows .env.example; committed deny list no longer matches it | pass (committed config); live read refused by this machine's local settings, see Deviations |
| NFR-SEC-005 | Push and PR ask first | `.claude/settings.json` ask: `git push`, `gh pr create`, `gh pr merge`; `defaultMode: default` | config; human `/permissions` check at CHECKPOINT B |
| NFR-SEC-005 | Dependency changes ask first | ask: `pnpm add/remove/install`, `pnpm --filter * add` | config (not exercised live; 8.1 avoided the prompt) |
| NFR-SEC-005 | Unapproved Docker commands ask first | no allow rule for `docker run/build/volume`; `defaultMode: default` | config |
| NFR-MNT-001 | Current settings pass | `scripts/check-claude-settings.test.mjs` : NFR-MNT-001: current settings pass; `pnpm check:claude-settings` exit 0 | pass |
| NFR-MNT-001 | Malformed rule rejected | `check-claude-settings.test.mjs` : NFR-MNT-001: rejects malformed rules (5) | pass |
| NFR-MNT-001 | Missing hook script rejected | `check-claude-settings.test.mjs` : NFR-MNT-001: rejects a missing hook script; requires the guard and formatter hooks | pass |
| NFR-MNT-001 | Edited TypeScript auto-formatted | `.claude/hooks/post-edit-format.test.mjs` : NFR-MNT-001: formats an edited ts file; live `live-format.ts` | pass |
| NFR-MNT-001 | Unfixable lint error reported | `post-edit-format.test.mjs` : NFR-MNT-001: reports unfixable lint errors; live `live-any.ts`; also caught a real issue in the 6.3 demo | pass |
| NFR-MNT-001 | Other files untouched | `post-edit-format.test.mjs` : NFR-MNT-001: leaves other files untouched; ignores paths outside the project | pass |

### agent-skills

| ID | Scenario | Test / check | Result |
| --- | --- | --- | --- |
| NFR-MNT-001 | Skill produces the layered pattern | demo 6.2: `GET /ping` in tracker; contract + test first; route/controller/service; 8/8 tests, lint clean | pass |
| NFR-MNT-001 | Skill rejects shortcuts | demo 6.2: a controller importing `@app/database` fails ESLint `no-restricted-imports`; the checklist flags ad-hoc error bodies | pass |
| NFR-MNT-001 | Skill creates a reversible migration | demo 6.3: `pnpm db:migrate`, `psql \d`, `pnpm db:migrate:undo`, table gone | pass |
| NFR-MNT-001 | Applied migration not edited | `sequelize-migration` SKILL.md step 2 + checklist item 1 | review |
| NFR-MNT-001 | Skill produces a shared contract | demo 6.1: `PingResponseSchema` in `@app/shared`, tests first, 34/34, build OK | pass |
| NFR-MNT-001 | Nested instructions present and referenced | `services/CLAUDE.md`, `apps/web/CLAUDE.md`; root `CLAUDE.md` "Claude Code setup" section | pass |
| NFR-MNT-001 | Instructions do not contradict the guidelines | line-by-line check against `docs/CODING_GUIDELINES.md`, SDS §3.1 and §9.2 (task 6.4; web rules aligned with §9.2) | pass |

## Requirements with no test

None. NFR-SEC-005 and NFR-MNT-001 have automated tests. The permission-prompt scenarios are covered
by the committed configuration, which the settings checker validates. One human look at `/permissions`
is requested at CHECKPOINT B.

## Reviewer findings

Independent `reviewer` subagent, 3 rounds. Each round returned CHANGES REQUIRED. All findings were
fixed, except the accepted items listed at the end. **The round-3 fixes (`001000b`) have not been
re-reviewed**, because `/sdd:run` allows at most 3 verify rounds. The human decides at CHECKPOINT B.

**Round 1** (1 high, 7 medium, 10 low)
- **Guard bypasses:**
  - `git push origin HEAD` on `main`, `--all`, `--mirror`, unknown branch
  - git global options
  - `-c core.hooksPath`, `HUSKY=0`
  - grouping, substitution and redirection
  - wrappers and multiple assignments
  - compose options before `down`

  Fixed in 639fdaa with tests.
- **Formatter:** `--` separator, symlink escape, silent failures. Fixed in 6fc9773.
- **Ask-first scenarios untested:** the checker now enforces `REQUIRED_POLICY`; also balanced
  parentheses and any missing hook script. More pnpm ask forms. Fixed in 5ccc937.
- **Wording:** SDS §11 test locations, `AppError` details mapping (typecheck proven),
  `docs($0)` → `docs(workflow)`, chat approval in `propose.md`, `@app/database/*` and
  `middleware/**` restricted, design notes. Fixed in bcd3b27 and 8f4692c.

**Round 2** (2 high, 5 medium, 3 low)
- **Guard:**
  - substitutions inside double quotes
  - env-file names embedded in words (`--env-file=`, `@file`)
  - wrapper options with values
  - `bash`/`sh -c`
  - `git config core.hooksPath`
  - quoted or exported `HUSKY`
  - push option values, `docker --context`

  Fixed in b356241. The guard now scans the raw text and checks substitutions recursively.
- **Checker:** broad allow rules covering ask-first commands, all six Jira write tools. Fixed in c0e8f19.
- **Service `test/` folders were never run:** fixed in 77da8d9 (all three vitest configs; a probe
  test ran).
- **Heredoc and quoted-text false positives:** accepted and documented (`docs/claude-setup.md`,
  "Accepted false positives").

**Round 3** (5 medium, 3 low). It confirmed all round-2 items.
- **Guard:**
  - two-dot env-file names (`.env.<mode>.local`)
  - `bash -lc` / `sh -ec` / `-c --`
  - `--no-veri`
  - `zsh`/`dash` after a wrapper
  - `find -exec`
  - `GIT_CONFIG_KEY_<n>=core.hooksPath`
  - shell recursion cap
- **Checker:** `Bash`, `Bash(*)`, wildcard prefixes (`Bash(do*)`).
- **Doc wording.**

All of these were fixed in 001000b, with 15 new tests, and are **not re-reviewed**.

**Accepted (not fixed)**
- Deliberately obfuscated commands (`eval`, base64, aliases, variables holding command names).
  They are documented as a limit.
- False positives from the raw-text env-file scan, such as a commit message or heredoc that
  mentions an env-file name. They are documented; the agent uses Edit/Write or rewords.
- The 7 `no-console` warnings (DEV-1 decision D15).

## Deviations from the spec or SDS

| Deviation | Reason |
| --- | --- |
| Extra ESLint rules: `no-restricted-imports` for `@app/database` in routes/controllers; `naming-convention` off for migrations/seeders | Found while demoing the skills (6.2, 6.3); recorded in design D7 |
| Deny list narrowed (`Read(./.env.*)` and `Bash(cat *.env*)` removed; specific `.env.*` names listed) | The old rules also blocked `.env.example`, contradicting the spec; the hook covers every `.env.*` |
| `.env.example` not readable by the agent **on this machine** | Refused by per-machine settings outside the repo; documented under "Recommended local settings" in `docs/claude-setup.md` |
| Frozen install not re-run in 8.1 | Lockfile unchanged; `pnpm install` is an ask command now |
| Service `vitest.config.ts` now also include `test/**/*.test.ts` | Review round 2: SDS §11 integration tests would otherwise never run |

## Result

**READY FOR PR, pending human confirmation.** All gates pass, every scenario maps to a test or a
recorded check, and every reviewer finding is fixed or accepted with a reason. The fixes from the
third and last allowed review round are covered by tests but have not been re-reviewed by the
reviewer subagent.
