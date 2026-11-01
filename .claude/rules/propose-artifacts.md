<!-- Project-customised from the reference project; see docs/workflow.md. Do not regenerate. -->
# Propose: artifact standards

Content rules for the artifacts `/opsx:propose` writes. The OpenSpec CLI supplies each artifact's `template`; this file says what must be filled in and how. Section names below are mandatory and appear in this order. Write "None" with a reason in a section that does not apply; never delete a section.

Ground every artifact in `CLAUDE.md`, `docs/CODING_GUIDELINES.md`, `docs/FRS.md`, `docs/SDS.md`, the current specs in `openspec/specs/`, and the layer `CLAUDE.md` files. Read FRS/SDS by grep then line range (`docs/token-policy.md`), never whole. Invent no business rule: if the ticket and the FRS do not say it, it is an open decision (see `open-decisions.md`).

## proposal.md

1. **Why**: Jira key (`DEV-<n>`) and assignment ID (`DEV-10xx`), the FRS/NFR requirement IDs it implements (`FR-...`, `NFR-...`), the FRS and SDS sections, and the user-visible problem. Distinguish observed behaviour (cite files) from proposed behaviour. Workflow tickets (DEV-1002 to 1005, 1014, 1015, 1017, 1018) carry no FRS IDs (FRS section 5): trace to the ticket's acceptance criteria instead and say so.
2. **Ticket**: key, summary, status read from Jira, the acceptance criteria parsed from the description, and the "is blocked by" tickets with their status (all `Done`). Ticket source is the live MCP fetch.
3. **What Changes**: bullets grouped by layer using the tags in `layout.md`. Observable behaviour, not implementation.
4. **Traceability**: table `FR ID | FRS wording (short) | Capability | Spec requirement`. Every ID mapped to the ticket in FRS section 5 appears once. An ID with no requirement is listed under Out of scope with the reason.
5. **Open decisions**: the table defined in `open-decisions.md`. Always present, even when every row is `Assumed`.
6. **Out of scope**: what the ticket will not do, citing FRS 1.3 and the assignment's fixed stack (SDS 13) for forbidden items.
7. **Capabilities**: New and Modified capability lists (exact directory names under `specs/`).
8. **Impact**: files and modules per layer, database changes (tables, indexes, migration; or "No schema change"), new dependencies with exact version and reason (or "None"; none outside this list may be added at apply), existing scenarios that must stay green.
9. **Rollback**: how to undo, and whether data or migrations are involved.
10. **Docs follow-up**: FRS or SDS rows to update (for example FRS section 5, SDS section 14), and the requirement status that archive records.

## specs/<capability>/spec.md (delta)

- Operations: `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED`. For `MODIFIED`, copy the whole current requirement from `openspec/specs/` first, keep its title exactly, then edit.
- Each requirement is one sentence with SHALL or MUST, ends with `Traces: FR-...` (one or more IDs), and has at least one scenario.
- Scenarios are `#### Scenario: <name> [FR-XXX-nnn]` with `**WHEN**` and `**THEN**` lines. The bracketed FRS ID ends the title (`openspec/config.yaml`). The name is unique across the change, because it becomes the test title. Include status code and error code (SDS 6.4) for every failure.
- Every capability that adds or changes an endpoint touching projects or tasks has a **non-member** scenario (404, never 403) and a **wrong-role** scenario (403), plus an **unauthenticated** scenario (401) and a **validation-failure** scenario (400 `VALIDATION_ERROR` or the field message in the web UI). If a capability is genuinely public or read-only, add the scenario that proves it and say why in the proposal.
- Cover the boundaries the FRS states (limits, lengths, ordering, page sizes) with one scenario each.
- No implementation detail (no function names, no library names).

## design.md

Sections in order: **Context**, **Goals / Non-Goals**, **Contract** (the `packages/shared` Zod schemas and types to add or change, written first), **Data model** (cite SDS section 5; either the Sequelize model/migration change with indexes, or "No schema change"), **Decisions** (`D1`, `D2`, ... each with the choice, the reason and the rejected alternative), **Layer plan** (per layer tag: modules, files, routes, query keys, error mapping), **Security and privacy** (SDS 7: auth, ownership/membership scope, what must never be logged, limits), **Docs checked** (library, version, topic checked with Context7, or why unavailable), **Risks / Trade-offs**, **Migration and rollback**, **Open questions** (link to proposal decision IDs, none left `Open`).

Reference the SDS sections followed ("Follows SDS section 7.2"). If the design differs from the SDS, state the difference and list the SDS update in the proposal's Docs follow-up. Every Decision that settles an open decision names its ID (`resolves OD-2`).

## tasks.md

- **Conventions** block first: shell note (Node 22, `pnpm`), scenario count per capability, the branch (`feature/{domain}/DEV-<n>-<short-name>`), the commit format (`type(area): <n.m> subject` with footer `Refs: DEV-<n>`; Claude commits only after the human replies `commit`), and the library APIs to verify with Context7 before use.
- Groups follow the dependency order in `layout.md`. A group has a number, a title, and tasks numbered `1.1`, `1.2`. Each task starts with its layer tag. Tasks that can run in parallel worktrees are marked `[PARALLEL]`.
- Inside a group: test tasks first, then the implementation task(s) that make them pass, then a checkpoint.
- A test task names the test file and the spec requirement, lists the scenarios it covers by exact name, and is marked as a `test-writer` task. One scenario appears in exactly one test task and gets exactly one test, titled `FR-XXX-nnn: <scenario name>` (the FRS ID from the scenario's bracket moved to the front; `NFR-...` for NFR scenarios).
- An implementation task says which test tasks it turns green and the FRS IDs it implements, and names its verifying command.
- The checkpoint task ends **every** group (database groups too) and is the full checkpoint of `checkpoint.md`: `pnpm build`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm test` (0 red), `pnpm test --coverage` (at least 80% on the files the group changed), `pnpm exec openspec validate <change> --strict`, the group's scenario tests, the database check when the group changed `packages/database`, then `reviewer`. Its result is appended to `review.md`.
- Size: about 1 to 2 hours of agent work and one commit per task.
- The last group is **Verification**: full-diff run of the checkpoint, reviewer on `git diff main...HEAD`, then `/opsx:verify <change>` in a fresh session.
- End the file with a **Scenario to test map**: table `Capability | Scenario | FRS ID | Test file | Task`. No scenario missing, none twice.

## delta-openapi.yaml

- Always present. OpenAPI 3.1, `info.version` is the ticket's release marker, `info.description` names the ticket and states in one paragraph whether endpoints are added, changed or untouched. Paths are relative to `/api/v1` (SDS 6.1).
- Endpoint changes go under `paths`. Document method, `operationId`, security, request schema, and every response status with its error `code`. Use the error envelope `{ error: { code, message, details? } }` and lists `{ items, meta }`.
- When no endpoint changes, `paths: {}` and an `x-web-consumes` or `x-service-exercises` map lists each endpoint the change relies on, with `onStatus` per status code (the observable reaction).
- Status codes must match the spec scenarios one to one. A scenario that expects a status the file does not list is a defect.

## Self-check before presenting

Run this checklist and fix gaps; report the result in the summary.

- The ticket was fetched live, its blockers are `Done`, and every ID mapped in FRS section 5 is traced in the proposal table (or the workflow-ticket exception is stated).
- No `Open` decision remains (the gate in `open-decisions.md` passed).
- Non-member, wrong-role, unauthenticated and validation-failure scenarios exist where required.
- Scenario names are unique and end with their FRS ID; the Scenario to test map covers every scenario once.
- `delta-openapi.yaml` statuses equal the scenario statuses.
- `pnpm exec openspec validate <change> --strict` passes.
- No new `any`, floating versions, packages or out-of-scope features are implied.
