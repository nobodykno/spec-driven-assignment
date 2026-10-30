# Spec Delta

## Purpose

Defines the reusable project skills and the layer-specific instructions the coding agent follows when it adds endpoints, database migrations and shared contracts, so new code matches the SDS and the coding guidelines.

## ADDED Requirements

### Requirement: Express endpoint skill
The repository SHALL provide an `express-endpoint` skill that tells the agent to add an endpoint in this order: Zod contract in `@app/shared`, a failing Supertest test named with the FRS ID, then route → controller → service, with errors thrown as `AppError` using SDS §6.4 codes and no model access from controllers.

#### Scenario: Skill produces the layered pattern [NFR-MNT-001]
- **WHEN** the agent invokes `express-endpoint` to add a sample endpoint on a scratch branch
- **THEN** the result has a schema in `packages/shared`, a test named `<FRS-ID>: ...` written first, and separate route, controller and service files in kebab-case, and the gates pass

#### Scenario: Skill rejects shortcuts [NFR-MNT-001]
- **WHEN** the skill's checklist is applied to a handler that queries a model directly from the controller or returns an ad-hoc error body
- **THEN** the checklist flags both as violations

### Requirement: Sequelize migration skill
The repository SHALL provide a `sequelize-migration` skill that tells the agent to create a new timestamped `.cjs` migration in `packages/database/migrations` with `up` and `down`, never to edit an applied migration or use `sync()`, and to prove the migration by running it and undoing it locally.

#### Scenario: Skill creates a reversible migration [NFR-MNT-001]
- **WHEN** the agent invokes `sequelize-migration` for a throwaway table on a scratch branch
- **THEN** `pnpm db:migrate` applies it, the undo command reverts it, and the table is gone afterwards

#### Scenario: Applied migration is not edited [NFR-MNT-001]
- **WHEN** a requested change would alter a migration that `git log` shows on `main`
- **THEN** the skill directs the agent to add a new migration instead

### Requirement: Zod contract skill
The repository SHALL provide a `zod-contract` skill that tells the agent to define request and response schemas in `packages/shared/src/schemas/<area>.ts`, export inferred types, re-export them from the package index, and write schema tests named with the FRS ID before any service or web code uses them.

#### Scenario: Skill produces a shared contract [NFR-MNT-001]
- **WHEN** the agent invokes `zod-contract` for a sample schema on a scratch branch
- **THEN** the schema, its inferred type and its tests live in `packages/shared`, the type is used from `@app/shared`, and `pnpm --filter @app/shared test` passes

### Requirement: Layer-specific instructions
The repository SHALL provide `services/CLAUDE.md` and `apps/web/CLAUDE.md` with the rules for their layer. The root `CLAUDE.md` SHALL point to them, to the hooks and to the skills.

#### Scenario: Nested instructions present and referenced [NFR-MNT-001]
- **WHEN** the agent works on a file under `services/` or `apps/web/`
- **THEN** the matching nested `CLAUDE.md` exists, states the layer rules (layering, errors, tests for services; components, data fetching, tests for web), and the root `CLAUDE.md` references it

#### Scenario: Instructions do not contradict the guidelines [NFR-MNT-001]
- **WHEN** the nested files are compared with `docs/CODING_GUIDELINES.md` and SDS §3.1
- **THEN** no rule in them contradicts either document
