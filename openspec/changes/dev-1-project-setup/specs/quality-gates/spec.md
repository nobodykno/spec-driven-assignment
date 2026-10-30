# Spec Delta

## Purpose

Defines the root quality-gate commands every change must pass, and the code rules (strict TypeScript, no `any`, no suppressed type errors, consistent formatting) that those gates enforce.

## ADDED Requirements

### Requirement: Root quality-gate commands
The repository root SHALL provide `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test`, each running across every workspace and exiting non-zero if any workspace fails.

#### Scenario: All gates pass on a clean checkout [NFR-MNT-001]
- **WHEN** `pnpm build && pnpm lint && pnpm typecheck && pnpm test` runs after `pnpm install`
- **THEN** every command exits 0

#### Scenario: A failing test fails the gate [NFR-MNT-001]
- **WHEN** any test in any workspace fails
- **THEN** `pnpm test` exits non-zero

#### Scenario: Tests run without a database [NFR-MNT-001]
- **WHEN** `pnpm test` runs and no PostgreSQL server is available
- **THEN** all tests in this change still pass

### Requirement: Strict TypeScript
Every TypeScript workspace SHALL compile with `strict: true`, and a type error in any workspace SHALL fail `pnpm typecheck`.

#### Scenario: Strict compile passes [NFR-MNT-001]
- **WHEN** `pnpm typecheck` runs on the repository
- **THEN** it exits 0

#### Scenario: Type error fails typecheck [NFR-MNT-001]
- **WHEN** a workspace contains an expression that violates strict mode (for example an implicit `any` parameter)
- **THEN** `pnpm typecheck` exits non-zero

### Requirement: Lint and format rules
`pnpm lint` SHALL run ESLint and a Prettier format check over the repository and SHALL fail on explicit `any`, on `@ts-ignore` / `@ts-nocheck` comments, on React hooks rule violations and on unformatted files.

#### Scenario: Clean code passes lint [NFR-MNT-001]
- **WHEN** `pnpm lint` runs on the repository
- **THEN** it exits 0

#### Scenario: Explicit any is rejected [NFR-MNT-001]
- **WHEN** a source file declares `const x: any = 1`
- **THEN** `pnpm lint` exits non-zero and reports `@typescript-eslint/no-explicit-any`

#### Scenario: ts-ignore is rejected [NFR-MNT-001]
- **WHEN** a source file contains a `// @ts-ignore` comment
- **THEN** `pnpm lint` exits non-zero and reports `@typescript-eslint/ban-ts-comment`

#### Scenario: Unformatted file is rejected [NFR-MNT-001]
- **WHEN** a source file is not formatted according to the Prettier config
- **THEN** `pnpm lint` exits non-zero and names the file

### Requirement: Coding guideline rules
`pnpm lint` SHALL enforce `docs/CODING_GUIDELINES.md`. These are errors: single quotes and semicolons, `===`, braces on every block, nesting depth at most 3, cyclomatic complexity at most 10, explicit return types on exported functions, named exports only (config files exempt) and kebab-case file names. These are warnings: functions over 30 lines and `console` use.

#### Scenario: Guideline-compliant code passes [NFR-MNT-001]
- **WHEN** `pnpm lint` runs on the repository after the guideline fixes
- **THEN** it exits 0 with zero errors

#### Scenario: Style violations rejected [NFR-MNT-001]
- **WHEN** a source file uses double quotes, omits a semicolon, uses `==` or an `if` without braces
- **THEN** ESLint reports `quotes`, `semi`, `eqeqeq` or `curly` as errors

#### Scenario: Structural violations rejected [NFR-MNT-001]
- **WHEN** a function nests blocks 4 deep or has complexity 11
- **THEN** ESLint reports `max-depth` or `complexity` as errors

#### Scenario: TypeScript and export violations rejected [NFR-MNT-001]
- **WHEN** an exported function has no return type, or a non-config module has a default export
- **THEN** ESLint reports `@typescript-eslint/explicit-function-return-type` or `no-restricted-exports` as errors

#### Scenario: Non-kebab-case file name rejected [NFR-MNT-001]
- **WHEN** a source file is named `UserService.ts`
- **THEN** lint fails and names the file

#### Scenario: Soft limits warn [NFR-MNT-001]
- **WHEN** a function is longer than 30 lines or calls `console.log`
- **THEN** ESLint reports a warning and `pnpm lint` still exits 0

### Requirement: Shared error format
Services SHALL return errors as `{ "error": { "code", "message", "details?" } }` using only the codes listed in SDS §6.4, and unexpected errors SHALL become 500 `INTERNAL_ERROR` without a stack trace.

#### Scenario: Unexpected error is sanitised [NFR-MNT-001]
- **WHEN** a route handler in auth or tracker throws an unexpected error
- **THEN** the response is 500 `{"error":{"code":"INTERNAL_ERROR","message":...}}` and the body contains no stack trace

#### Scenario: Unknown error code is rejected by the shared schema [NFR-MNT-001]
- **WHEN** an error body with code `SOMETHING_ELSE` is validated against the shared error schema
- **THEN** validation fails
