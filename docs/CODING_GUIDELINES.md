# Coding guidelines

> Source: the rules Paramjit Jena gave in chat on 2026-10-30. No separate guideline document existed in
> the repo, so this file records those rules. Tooling enforces them (design D15 in
> `openspec/changes/dev-1-project-setup/design.md`): `pnpm lint` runs ESLint and Prettier, and
> the Git hooks run lint-staged and commitlint.

## Naming

| What | Style | Example |
| --- | --- | --- |
| Variables, functions | camelCase | `checkDatabase`, `apiStatus` |
| Classes, interfaces, types, enum members | PascalCase | `AppError`, `HealthResponse` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_TIMEOUT_MS` |
| Files and folders | kebab-case | `user-service.ts`, `error-handler.ts` |

## Style

- 2 spaces, semicolons, single quotes, max 100 characters per line, trailing commas.
- Prettier (`.prettierrc`) formats code; don't hand-format against it.

## Structure

- One responsibility per file; files under ~300 lines.
- Named exports only. Default exports only where a framework requires them (config files such as
  `vite.config.ts`, `eslint.config.js`, `commitlint.config.mjs`).
- Functions ≤ 30 lines, cyclomatic complexity ≤ 10, nesting ≤ 3 levels. Prefer early returns.

## TypeScript

- No `any`: use `unknown` or a specific type. No `@ts-ignore`.
- Explicit return types on exported functions.
- `readonly` and `private` where possible.
- Union types or enums for fixed sets of values.

## Variables

- `const` by default, `let` only when reassigned, never `var`.

## Async and errors

- `async`/`await` only; no `.then` chains in new code.
- Never swallow errors. Throw meaningful errors (`AppError` from `@app/shared`) and handle every
  promise rejection.
- No `eval`, `new Function` or other dynamic code execution.

## Security

- Validate all external input with Zod schemas from `@app/shared`.
- No secrets in code or logs (secrets come from environment variables, SDS §7.4).

## Logging

- No `console.log` in app code: use the logger. Until the logger arrives (pino, DEV-1006),
  `no-console` is a warning and the services' startup messages use `console.log`.
  CLI scripts in `scripts/` may write to the console.

## Enforcement

| Rule | Tool | Level |
| --- | --- | --- |
| `semi`, `quotes` (single), `eqeqeq`, `curly` | ESLint | error |
| `max-depth` 3, `complexity` 10 | ESLint | error |
| `max-lines-per-function` 30 | ESLint | warn (off in tests) |
| `no-console` | ESLint | warn (off in `scripts/`) |
| `@typescript-eslint/no-explicit-any`, `explicit-function-return-type`, `no-unused-vars` | ESLint | error |
| `prefer-const`, `no-var`, `no-eval`, `no-implied-eval`, `no-new-func` | ESLint | error |
| Named exports only (`no-restricted-exports`) | ESLint | error (config files exempt) |
| kebab-case files, camelCase vars/functions, PascalCase classes | ESLint (naming plugin, see `docs/versions.md`) | error |
| Formatting | Prettier (`.prettierrc`) | `pnpm lint` fails on unformatted files |

`.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

## Commits

`type(scope): subject` plus a `Refs: DEV-N` footer (Jira key), checked by commitlint on every
commit.

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`.
- Scope (area): `auth`, `tracker`, `gateway`, `web`, `shared`, `database`, `docker`, `workflow`,
  `docs`. Root tooling (hooks, lint config, scripts, OpenSpec, Claude config) uses `workflow`.
- Header ≤ 72 characters; subject in the imperative, starting lowercase, no trailing period.

```
feat(auth): 2.1 add login endpoint

Refs: DEV-9
```

## Editor

`.vscode/settings.json` formats on save and applies ESLint fixes on save.
`.vscode/extensions.json` recommends ESLint, Prettier and GitLens.
