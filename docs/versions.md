# Versions

Every version is pinned exactly (NFR-OPS-001). `pnpm check:versions` fails on any `^`, `~`, `*`,
`latest`, range or floating Docker tag. Recorded for DEV-1 on 2026-10-30.

## Runtime and tooling

| Item | Version | Where |
| --- | --- | --- |
| Node.js | 22.23.1 local, `>=22.22.1 <23` (`engines`), `node:22.23.4-alpine` in Docker | root `package.json`, Dockerfiles |
| pnpm | 11.28.9 | `packageManager`, Dockerfiles (`corepack prepare pnpm@11.28.9`) |
| PostgreSQL | 16.15 (`postgres:16.15-alpine`) | `docker-compose.yml` |
| nginx | 1.31.8 (`nginx:1.31.8-alpine`) | `apps/web/Dockerfile` |
| Chromium (Playwright) | headless shell 156.0.8078.4 (build v1248) | user cache, not the repo |

## npm packages

| Package | Version | Workspace | Kind |
| --- | --- | --- | --- |
| @commitlint/cli | 21.2.4 | root | dev |
| @commitlint/config-conventional | 21.2.4 | root | dev |
| @eslint/js | 10.0.1 | root | dev |
| @playwright/test | 1.64.1 | root | dev |
| concurrently | 10.0.6 | root | dev |
| eslint | 10.13.0 | root | dev |
| eslint-config-prettier | 10.1.8 | root | dev |
| eslint-plugin-react-hooks | 7.1.1 | root | dev |
| globals | 17.13.0 | root | dev |
| husky | 9.1.7 | root | dev |
| lint-staged | 17.6.0 | root | dev |
| prettier | 3.9.10 | root | dev |
| typescript | 5.9.3 | root | dev |
| typescript-eslint | 8.72.1 | root | dev |
| vitest | 5.0.5 | root | dev |
| react, react-dom | 19.3.1 | apps/web | prod |
| @types/react, @types/react-dom | 19.3.0 | apps/web | dev |
| @testing-library/dom | 10.4.2 | apps/web | dev |
| @testing-library/react | 16.3.3 | apps/web | dev |
| @vitejs/plugin-react | 6.1.2 | apps/web | dev |
| jsdom | 30.1.3 | apps/web | dev |
| vite | 8.3.5 | apps/web | dev |
| zod | 4.6.7 | packages/shared | prod |
| sequelize | 6.37.8 | packages/database | prod |
| pg | 8.23.1 | packages/database | prod |
| pg-hstore | 2.3.4 | packages/database | prod |
| sequelize-cli | 6.6.5 | packages/database | dev |
| express | 5.3.0 | auth, tracker, api-gateway | prod |
| http-proxy-middleware | 4.2.1 | api-gateway | prod |
| @types/express | 5.0.6 | auth, tracker, api-gateway | dev |
| @types/node | 22.20.5 | shared, database, auth, tracker, api-gateway | dev |
| supertest | 7.3.1 | auth, tracker, api-gateway | dev |
| @types/supertest | 7.2.1 | auth, tracker, api-gateway | dev |
| tsx | 4.23.15 | auth, tracker, api-gateway | dev |

Comparison: this table was checked against every `package.json` (root, `apps/web`,
`packages/shared`, `packages/database`, `services/auth`, `services/tracker`,
`services/api-gateway`). All 50 pinned entries match; `workspace:*` links are not listed.

## Graph tools (DEV-1015, installed 2026-10-30)

Installed outside the repo with `uv tool install <package>==<version>` (no manual Python install).
`pnpm check:graph-docs` fails when one of these has no exact version.

| Tool | Version | Where |
| --- | --- | --- |
| uv | 0.13.6 | Homebrew (`brew install uv`) |
| code-review-graph | 2.3.9 | `uv tool install code-review-graph==2.3.9` (PyPI) |
| graphifyy | 0.9.97 | `uv tool install graphifyy==0.9.97` (PyPI; CLI `graphify`) |

## How versions were checked

- npm packages: `pnpm view <pkg> version engines peerDependencies` (2026-10-29; Git-hook tools and
  Playwright on 2026-10-30). Context7 MCP is not configured, so APIs were checked against each
  package's own docs and type definitions (design D12, "Docs checked").
- Compatibility pins: TypeScript stays at 5.9.3 because typescript-eslint 8.72.1 supports
  `<6.1.0`; Vite is 8.x because @vitejs/plugin-react 6.1.2 needs `vite ^8`; lint-staged 17 needs
  Node `>=22.22.1`, so the `engines` floor was raised.
- Docker images: the Docker Hub API was not reachable from the agent session, so the newest
  versions were read from the `16-alpine`, `22-alpine` and `1-alpine` images' environment
  (`PG_VERSION`, `NODE_VERSION`, `NGINX_VERSION`), and each exact tag was confirmed with
  `docker pull` (exit 0).
- pnpm 11 build scripts: `pnpm-workspace.yaml` uses `allowBuilds: { esbuild: true }`; pnpm 11
  ignores the older `onlyBuiltDependencies` key.

## Skipped: @mindfiredigital/eslint-plugin-hub 2.2.0

It supports ESLint flat config (`configs['flat/general']`), but it could not be installed safely:
its `postinstall` script (`lib/utils/check-eslint-config.js`) looks for an ESLint config in its
own package folder, finds none, and waits on stdin for "install ESLint? (y/n)". `pnpm install`
hung, and answering "y" would run `npm init @eslint/config@latest` (npm and `latest` are not
allowed here). Marking it `false` in pnpm 11 `allowBuilds` did not stop the script. Naming is
enforced instead by `@typescript-eslint/naming-convention` (already installed), and kebab-case
file names by `scripts/check-file-names.mjs` (design D15).

## Local development migration note

Postgres now runs on host port **5433** with user `dev`, password `dev` and database `tracker`
(volume `tracker_pgdata`). Copy the new values from the `.env.example` files into your local
`.env` files, then `pnpm db:down` (old container) and `pnpm db:up`.
