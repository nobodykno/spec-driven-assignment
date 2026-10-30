# agent-guardrails Specification

## Purpose
Defines what the coding agent is prevented from doing in this repository, which actions need a human's approval, how files the agent edits are formatted, and how the permission configuration is kept valid.

## Requirements

### Requirement: Dangerous commands are blocked
Before the agent runs a shell command, a guard SHALL block it with an explanatory message and exit code 2 when the command deletes recursively and forcibly, force-pushes, pushes to `main`, bypasses Git hooks, prints the environment, or removes Docker volumes. Commands that only resemble these (for example `git push origin feature/x`, `rm -r dir`, `echo env`) SHALL run normally.

#### Scenario: Recursive forced delete blocked [NFR-SEC-005]
- **WHEN** the agent runs `rm -rf dist`, `rm -fr dist` or `rm --recursive --force dist`
- **THEN** the command does not run, and the agent receives a message naming the rule, with exit code 2

#### Scenario: Force push blocked [NFR-SEC-005]
- **WHEN** the agent runs `git push --force`, `git push -f origin x`, `git push --force-with-lease` or `git push origin +x`
- **THEN** the command is blocked with exit code 2

#### Scenario: Push to main blocked [NFR-SEC-005]
- **WHEN** the agent runs `git push origin main`, `git push origin HEAD:main`, or a plain `git push` while the current branch is `main`
- **THEN** the command is blocked with exit code 2

#### Scenario: Hook bypass blocked [NFR-MNT-001]
- **WHEN** the agent runs `git commit --no-verify` or `git push --no-verify`
- **THEN** the command is blocked with exit code 2

#### Scenario: Environment dump blocked [NFR-SEC-005]
- **WHEN** the agent runs `printenv` or a bare `env`
- **THEN** the command is blocked with exit code 2

#### Scenario: Docker volume removal blocked [NFR-SEC-005]
- **WHEN** the agent runs `docker compose down -v` or `docker compose down --volumes`
- **THEN** the command is blocked with exit code 2

#### Scenario: Ordinary commands allowed [NFR-SEC-005]
- **WHEN** the agent runs `git push -u origin feature/DEV-5-claude-setup` on a feature branch, `rm -r tmp`, `git status`, `echo env` or `pnpm test`
- **THEN** the guard lets the command run (exit code 0, no message)

### Requirement: Secret files are never read by the agent
The guard SHALL block any agent tool call that reads, writes or searches a `.env` or `.env.*` file, other than `.env.example`. This covers file tools and shell commands that name such a file.

#### Scenario: Reading .env with a file tool blocked [NFR-SEC-005]
- **WHEN** the agent uses Read, Edit, Write, Grep or Glob on `.env`, `services/auth/.env` or `.env.production`
- **THEN** the call is blocked with exit code 2 and a message saying secrets come only from the environment

#### Scenario: Reading .env from the shell blocked [NFR-SEC-005]
- **WHEN** the agent runs `cat .env`, `head services/auth/.env`, `source .env` or `grep KEY .env.local`
- **THEN** the command is blocked with exit code 2

#### Scenario: .env.example stays readable [NFR-SEC-005]
- **WHEN** the agent reads `services/auth/.env.example` with Read or `cat`
- **THEN** the call is allowed

### Requirement: Risky actions need human approval
The project permission configuration SHALL make the agent ask for approval before `git push`, `gh pr create`, `gh pr merge`, `pnpm add`/`remove`/`install`, any Docker command other than the approved `docker compose stop/start/up/exec/logs/ps`, and every Jira write. The default permission mode SHALL be `default`.

#### Scenario: Push and PR ask first [NFR-SEC-005]
- **WHEN** the agent wants to run `git push` or `gh pr create`
- **THEN** Claude Code asks the human before running it

#### Scenario: Dependency changes ask first [NFR-SEC-005]
- **WHEN** the agent wants to run `pnpm add zod@4.6.7`
- **THEN** Claude Code asks the human before running it

#### Scenario: Unapproved Docker commands ask first [NFR-SEC-005]
- **WHEN** the agent wants to run `docker run`, `docker build` or `docker volume rm`
- **THEN** Claude Code asks the human, because no allow rule matches and the mode is `default`

### Requirement: Permission configuration is valid
`pnpm lint` SHALL fail when `.claude/settings.json` contains a malformed permission rule, a rule listed in two of allow/ask/deny, an unknown `defaultMode`, or a hook command whose script file does not exist.

#### Scenario: Current settings pass [NFR-MNT-001]
- **WHEN** `pnpm lint` runs on the committed `.claude/settings.json`
- **THEN** the settings check passes

#### Scenario: Malformed rule rejected [NFR-MNT-001]
- **WHEN** a rule such as `Bash(curl -s:* http://localhost*)` (`:*` not at the end) or `Bash(git push` (unbalanced) is added
- **THEN** the settings check fails and names the rule

#### Scenario: Missing hook script rejected [NFR-MNT-001]
- **WHEN** a hook command points to a script that does not exist
- **THEN** the settings check fails and names the hook

### Requirement: Edited files are formatted immediately
After the agent edits or writes a `ts`, `tsx`, `js`, `mjs`, `cjs`, `json`, `yaml` or `yml` file, a hook SHALL run Prettier and ESLint auto-fix on that file. Remaining lint errors SHALL be reported back to the agent. Ignored files and other file types SHALL be left unchanged.

#### Scenario: Edited TypeScript is auto-formatted [NFR-MNT-001]
- **WHEN** the agent writes a `.ts` file with double quotes and missing semicolons
- **THEN** the file on disk uses single quotes and semicolons right after the edit

#### Scenario: Unfixable lint error reported [NFR-MNT-001]
- **WHEN** the agent writes a `.ts` file containing `const x: any = 1`
- **THEN** the hook reports `@typescript-eslint/no-explicit-any` back to the agent with exit code 2

#### Scenario: Other files untouched [NFR-MNT-001]
- **WHEN** the agent edits a Markdown file or a file under `openspec/`
- **THEN** the hook exits 0 without changing the file
