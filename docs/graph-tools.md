# Graph tools: Code Review Graph and Graphify

Two local code graphs for targeted queries and review (DEV-1015, Assignment Rules 12–16). Every
result below was run on 2026-10-30 on branch `feature/DEV-18-graph-tools` (built at commit
`812ec9a`) and then **confirmed against the source file**. `pnpm check:graph-docs` (part of
`pnpm lint`) fails if fewer than 5 queries are confirmed.

## Setup

```sh
brew install uv                              # uv 0.13.6, no manual Python install
uv tool install code-review-graph==2.3.9     # PyPI
uv tool install graphifyy==0.9.97            # PyPI, CLI name `graphify`
export PATH="$HOME/.local/bin:$PATH"         # where uv puts the executables
code-review-graph build                      # full build -> .code-review-graph/graph.db
graphify update .                            # AST only -> graphify-out/
```

- Versions are recorded in `docs/versions.md`.
- Caches are git-ignored (`.code-review-graph/` also contains its own `.gitignore`; `graphify-out/`
  is in the root `.gitignore`). `git status` is clean after a build.
- Not run, on purpose: `code-review-graph install` and `graphify install` (they write MCP/skill
  config for AI platforms) and the `/graphify` skill (it calls an LLM for docs and images).
- Both tools were used offline-style: only `build`, `update` and read-only query commands, with no
  API key set. Network traffic was **not** monitored, so "nothing was sent" is not proven; it is only
  what these commands are documented to do (`graphify update`: "no LLM needed").

## Build stats

| Tool | Nodes | Edges | Files | Time | Notes |
| --- | --- | --- | --- | --- | --- |
| Code Review Graph 2.3.9 | 447 | 3,310 | 61 stored (69 parsed, per the build log) | 4.7 s | JavaScript, TypeScript, TSX; `graph.db` 5.1 MB |
| Graphify 0.9.97 | 1,580 | 1,852 | 170 code files extracted | 4.3 s | 133 communities; includes Markdown headings; `graphify-out` 3.7 MB; 21 non-code files skipped (e.g. `.env.example`); 37 files yielded no symbols |

The two tools count differently (Graphify adds documentation nodes), so the numbers are not
comparable with each other. The 61 vs 69 files difference in Code Review Graph is as printed by the
tool; it was not investigated.

## Queries

### Query 1: which files import `check-claude-settings.mjs`?

- Command: `code-review-graph query importers_of scripts/check-claude-settings.mjs`
- Result: one `IMPORTS_FROM` edge, from `scripts/check-claude-settings.test.mjs` line 5.
- Confirmed against: `scripts/check-claude-settings.test.mjs:5` is
  `import { checkSettings, REQUIRED_HOOKS, REQUIRED_POLICY } from './check-claude-settings.mjs';`.
  A `grep -rn "check-claude-settings"` finds no other importer (only the `package.json` script and a comment).

### Query 2: who calls `checkRule`?

- Command: `code-review-graph query callers_of checkRule`
- Result: one `CALLS` edge from `checkPermissions` at line 92 of `scripts/check-claude-settings.mjs`.
- Confirmed against: `scripts/check-claude-settings.mjs:92` is `findings.push(checkRule(rule));`
  inside `checkPermissions`.

### Query 3: which tests cover `checkSettings`?

- Command: `code-review-graph query tests_for checkSettings`
- Result: test nodes in `scripts/check-claude-settings.test.mjs`, among them
  `NFR-MNT-001: requires the guard and formatter hooks to be registered` at line 170.
- Confirmed against: `scripts/check-claude-settings.test.mjs:170` is exactly that `it(...)`.

### Query 4: where is `bashPrefix` defined?

- Command: `code-review-graph search bashPrefix --limit 5`
- Result: kind `Function`, `scripts/check-claude-settings.mjs`, line 49.
- Confirmed against: `scripts/check-claude-settings.mjs:49` is `const bashPrefix = (rule) => {`;
  it is used at lines 130 and 134.

### Query 5: blast radius of changing `check-claude-settings.mjs`

- Command: `code-review-graph impact --files scripts/check-claude-settings.mjs --depth 2`
- Result: changed file `scripts/check-claude-settings.mjs`; impacted file
  `scripts/check-claude-settings.test.mjs`; `total_impacted` 10 nodes.
- Confirmed against: the only importer is the test file (Query 1); `checkSettings` is the exported
  entry point (line 169) and calls `checkPermissions`, `checkPolicy` and `checkHooks`.

### Query 6: what is affected if `checkRule` changes (Graphify)

- Command: `graphify affected "checkRule"`
- Result: `checkPermissions()` `[calls]` at `scripts/check-claude-settings.mjs:L92` and
  `checkSettings()` `[calls]` at `:L177`.
- Confirmed against: line 92 calls `checkRule`; line 177 of the same file is
  `...checkPermissions(settings.permissions),` inside `checkSettings` (line 169). So `checkSettings`
  is affected through `checkPermissions`, as the 2-step reverse traversal says.

### Query 7: what uses `AppError` (Graphify)

- Command: `graphify explain "AppError"`
- Result: defined at `packages/shared/src/errors.ts` L45, degree 24. Importers include
  `services/api-gateway/src/app.ts` L3 and the `error-handler.ts` of the gateway, auth and tracker;
  `errorHandler()` calls it at L16 and `notFoundHandler()` at L5 in each; `sendServiceUnavailable()` at
  `services/api-gateway/src/app.ts` L25. The other connections are documentation references.
- Confirmed against: `grep -rn AppError services packages` shows `errors.ts:45`, `app.ts:3` and `:25`,
  and in each service `error-handler.ts` lines 1, 5 and 16, plus `common.test.ts:2`. The degree 24 also
  counts references from `docs/CODING_GUIDELINES.md`, the express-endpoint skill and OpenSpec files.

## Reading the output

- Code Review Graph prints JSON with absolute paths; use `--brief` on `detect-changes` for a summary.
- `graphify query` returns a token-capped (`--budget`, default 2000) subgraph for a natural-language
  question. Its first answer for "how are Claude settings permissions validated" started from
  documentation headings, not from the code, so name the code symbol when you can (`explain`, `affected`).
- Both graphs are a snapshot: rerun `code-review-graph update` and `graphify update .` after changes.
