# Design: DEV-18 Codebase graph setup

## Context

`docs/token-efficiency.md` exists from DEV-6 (agent measurement). `docs/versions.md` lists pinned
versions for npm and runtime. No Python tooling is installed. Follows SDS §3 and §11.

## Decisions

- **D1 `uv tool install <pkg>==<version>`**: isolated, pinned, no manual Python install.
- **D2 Local only.** Graphs are built from the repo with local parsing; any external call is recorded or the step is dropped.
- **D3 Caches ignored.** Cache/db folders are discovered after the first build, then added to `.gitignore` before any commit.
- **D4 Fair comparison.** Same task and same change reviewed in both modes, fresh context each, counts from `/cost` or tool output; numbers are never estimated, missing ones are written as "not provided".
- **D5 Checker.** `scripts/check-graph-docs.mjs` validates versions, ignore entries, ≥5 confirmed queries and the 4-run table; added to `pnpm lint`.

## Docs checked

Install and CLI commands are read from each tool's `--help` and README during apply and recorded in `docs/graph-tools.md`.
