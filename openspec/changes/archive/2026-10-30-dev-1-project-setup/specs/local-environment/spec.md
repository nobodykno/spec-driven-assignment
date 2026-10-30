# Spec Delta

## Purpose

Defines how a developer starts the database and the full stack locally in a reproducible way, with every dependency and container image pinned to an exact version.

## ADDED Requirements

### Requirement: Workspace installs reproducibly
Running `pnpm install` at the repository root SHALL install every workspace (apps/web, services/api-gateway, services/auth, services/tracker, packages/database, packages/shared) from the committed lockfile without errors.

#### Scenario: Clean install succeeds [NFR-OPS-001]
- **WHEN** a developer runs `pnpm install --frozen-lockfile` on a fresh clone with Node 22
- **THEN** the command exits 0 and all six workspaces are linked

#### Scenario: Lockfile out of date fails the install [NFR-OPS-001]
- **WHEN** a `package.json` dependency is changed without updating `pnpm-lock.yaml` and `pnpm install --frozen-lockfile` runs
- **THEN** the command exits non-zero

### Requirement: Local PostgreSQL 16 on port 5433
`pnpm db:up` SHALL start PostgreSQL 16 in Docker Compose on host port 5433, with data in a named volume and a healthcheck that reports healthy once the server accepts connections.

#### Scenario: Database starts and becomes healthy [NFR-OPS-001]
- **WHEN** a developer runs `pnpm db:up`
- **THEN** a PostgreSQL 16 container is listening on host port 5433 and its Compose health status becomes `healthy`

#### Scenario: Data survives a restart [NFR-OPS-001]
- **WHEN** the database is stopped with `pnpm db:down` and started again with `pnpm db:up`
- **THEN** data written before the restart is still present

#### Scenario: Port 5432 left free [NFR-OPS-001]
- **WHEN** a developer already runs a local PostgreSQL on port 5432
- **THEN** `pnpm db:up` still succeeds because the container binds only host port 5433

### Requirement: Whole stack starts with Docker Compose
`docker compose up` SHALL build and start postgres, auth, tracker, api-gateway and web; only the gateway (4000), web (8080) and postgres (5433) SHALL be published on the host.

#### Scenario: Full stack healthy [NFR-OPS-001]
- **WHEN** a developer runs `docker compose up --build`
- **THEN** all five containers start and `GET http://localhost:4000/health` returns 200

#### Scenario: Internal services not published [NFR-OPS-001]
- **WHEN** the stack is running under Docker Compose
- **THEN** connecting to host ports 4001 and 4002 is refused

#### Scenario: Image build fails loudly on install errors [NFR-OPS-001]
- **WHEN** dependency installation fails while building a service image
- **THEN** the image build fails instead of producing an image

### Requirement: No floating versions
Every npm dependency SHALL be pinned to an exact version and every Docker image SHALL use an exact version tag; `latest`, version ranges and major-only tags SHALL be rejected by an automated check, and every pinned version SHALL be recorded in `docs/versions.md`.

#### Scenario: Pinned repository passes the version check [NFR-OPS-001]
- **WHEN** `pnpm check:versions` runs on the repository
- **THEN** it exits 0

#### Scenario: Caret range is rejected [NFR-OPS-001]
- **WHEN** any workspace `package.json` declares a dependency as `^5.3.0`, `~5.3.0` or `latest`
- **THEN** `pnpm check:versions` exits non-zero and names the package and file

#### Scenario: Floating Docker tag is rejected [NFR-OPS-001]
- **WHEN** `docker-compose.yml` or a Dockerfile uses an image tag such as `postgres:16`, `node:22-slim` or `nginx:latest`, or a Dockerfile installs `pnpm@latest`
- **THEN** `pnpm check:versions` exits non-zero and names the file and image
