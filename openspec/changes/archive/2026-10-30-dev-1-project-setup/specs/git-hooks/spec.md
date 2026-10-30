# Spec Delta

## Purpose

Defines the local Git hooks that stop broken, unformatted, badly described or secret-bearing changes from being committed or pushed.

## ADDED Requirements

### Requirement: Hooks install automatically
`pnpm install` SHALL install the Git hooks through the root `prepare` script (`husky`), and an install without a `.git` directory (Docker builds) SHALL still succeed.

#### Scenario: Hooks active after install [NFR-MNT-001]
- **WHEN** `pnpm install` runs in a clone of the repository
- **THEN** `git config core.hooksPath` prints `.husky/_` and the pre-commit, commit-msg and pre-push hooks run on the next commit and push

#### Scenario: Install without Git still succeeds [NFR-MNT-001]
- **WHEN** `pnpm install --frozen-lockfile` runs in a Docker build with `HUSKY=0` and no `.git` directory
- **THEN** the install exits 0 and no hooks are installed

### Requirement: Commit message format
The commit-msg hook SHALL run commitlint with config-conventional plus the project rules: type in `feat, fix, docs, style, refactor, test, chore, build, ci, perf`; scope required and one of `auth, tracker, gateway, web, shared, database, docker, workflow, docs`; header at most 72 characters; subject not starting with a capital letter and not ending with a period; body lines at most 72 characters; and a mandatory `Refs: DEV-N` footer (Jira key) on every commit, on every branch.

#### Scenario: Valid commit message accepted [NFR-MNT-001]
- **WHEN** the message is `feat(auth): 2.1 add login endpoint` with the footer `Refs: DEV-9`
- **THEN** commitlint exits 0 and the commit is created

#### Scenario: Commit message without a scope rejected [NFR-MNT-001]
- **WHEN** the message is `feat: add login endpoint` with the footer `Refs: DEV-9`
- **THEN** the commit is rejected and commitlint reports `scope-empty`

#### Scenario: Scope that is not an area rejected [NFR-MNT-001]
- **WHEN** the message is `feat(DEV-9): add login endpoint` or `feat(login): add login endpoint` with the footer `Refs: DEV-9`
- **THEN** the commit is rejected and commitlint reports `scope-enum`

#### Scenario: Missing Refs footer rejected [NFR-MNT-001]
- **WHEN** a message on any branch, including `main`, has no `Refs: DEV-N` footer, or the footer is not a Jira key (`Refs: auth`)
- **THEN** the commit is rejected and commitlint reports `footer-refs`

#### Scenario: Unknown type, long header or badly cased subject rejected [NFR-MNT-001]
- **WHEN** the type is `feature` or `revert`, or the header is longer than 72 characters, or the subject starts with a capital letter or ends with a period, or a body line is longer than 72 characters
- **THEN** the commit is rejected

### Requirement: Staged secret check
The pre-commit hook SHALL fail when a staged file is named `.env` or `.env.*` (except `.env.example`), or when a staged file's content contains a private key block, a `JWT_SECRET=` assignment with a real value, or an AWS-style access key or secret key.

#### Scenario: Ordinary files pass [NFR-SEC-005]
- **WHEN** only source files, `.env.example` files and `JWT_SECRET=` placeholders (empty, `change-me`, `<...>`, `${...}`) are staged
- **THEN** the secret check exits 0

#### Scenario: Staged .env file rejected [NFR-SEC-005]
- **WHEN** `.env`, `services/auth/.env` or `.env.production` is staged
- **THEN** the commit is rejected and the file is named in the message

#### Scenario: Secret content rejected [NFR-SEC-005]
- **WHEN** a staged file contains `-----BEGIN ... PRIVATE KEY-----`, `JWT_SECRET=` followed by a real value, or a key matching `AKIA[0-9A-Z]{16}`
- **THEN** the commit is rejected, naming the file and the kind of secret but never printing the secret value

### Requirement: Staged lint and format
The pre-commit hook SHALL run lint-staged, applying `eslint --fix` and `prettier --write` to staged `*.ts`, `*.tsx`, `*.js`, `*.mjs`, `*.json`, `*.md`, `*.yaml` and `*.yml` files (respecting `.prettierignore` and the ESLint ignores).

#### Scenario: Auto-fixable problems are fixed [NFR-MNT-001]
- **WHEN** a staged `.ts` file is only badly formatted
- **THEN** it is reformatted, re-staged and the commit succeeds

#### Scenario: Unfixable lint error rejected [NFR-MNT-001]
- **WHEN** a staged `.ts` file contains `const x: any = 1`
- **THEN** the commit is rejected and ESLint reports `@typescript-eslint/no-explicit-any`

### Requirement: Pre-push quality gates
The pre-push hook SHALL run `pnpm build && pnpm lint && pnpm typecheck && pnpm test` and block the push if any of them fails.

#### Scenario: Passing gates allow the push [NFR-MNT-001]
- **WHEN** all four gates pass
- **THEN** `git push` proceeds

#### Scenario: Failing tests block the push [NFR-MNT-001]
- **WHEN** any test fails
- **THEN** `git push` is rejected and nothing is sent to the remote
