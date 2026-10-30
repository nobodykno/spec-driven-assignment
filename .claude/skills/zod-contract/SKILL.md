---
name: zod-contract
description: Define or change a request/response contract (Zod schema + inferred type) in @app/shared before any service or web code uses it. Use when an endpoint, form or API client needs a new or changed body, query or response shape, or when the user says "add a schema", "shared contract" or "zod contract".
---

# Zod contract (`@app/shared`)

Contracts come first (SDS §1.2.1, §6.1). Services validate input with them, and the web app parses
responses with them. Neither defines its own copy.

## Procedure

1. **Find the requirement.** Note the FRS ID and the exact fields, types, limits and error cases
   from `docs/FRS.md` and SDS §5.2 / §6.2. Do not invent fields.
2. **Pick the file:** `packages/shared/src/schemas/<area>.ts`, where area is one of `auth`,
   `project`, `task`, `comment`, `activity` or `common` (SDS §3). Create it in kebab-case if it
   does not exist.
3. **Write the tests first** in `packages/shared/src/schemas/<area>.test.ts`. Name each test with
   the FRS ID (`it('FR-TASK-001: rejects an empty title', …)`). Cover at least:
   - one valid example
   - each required field missing
   - each limit (min/max length, enum value, number range)
   - unknown extra fields, if the schema is `.strict()`

   Run `pnpm --filter @app/shared test` and watch the new tests fail.
4. **Write the schema:**
   - Name it in PascalCase with a `Schema` suffix: `CreateTaskBodySchema`, `TaskResponseSchema`.
   - Export the type with `z.infer`: `export type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>;`.
   - Request bodies use `.strict()`, so unknown fields are a `VALIDATION_ERROR`.
   - Use `z.enum([...])` for fixed sets (status, priority, role), `z.uuid()` for ids, and
     `z.iso.datetime()` / `z.iso.date()` for dates (Zod 4.6.7).
   - Add a one-line comment naming the FRS ID, as in `schemas/common.ts`.
5. **Re-export** from `packages/shared/src/index.ts` (`export * from './schemas/<area>.js';`).
6. **Verify:** `pnpm --filter @app/shared test && pnpm --filter @app/shared build`. Consumers
   import from `@app/shared`, never from a relative path into the package.

## Checklist

- [ ] The schema lives in `packages/shared/src/schemas/`, and no service or web file defines the same shape
- [ ] PascalCase `…Schema` name, an inferred type exported next to it, and a named export only
- [ ] Tests exist and were written first; names start with the FRS ID
- [ ] Error responses still use `ErrorResponseSchema` and codes from `ErrorCodeSchema` (SDS §6.4)
- [ ] No `any`, no `z.any()`, and no `.passthrough()` on request bodies
- [ ] It is re-exported from `src/index.ts`, and `pnpm --filter @app/shared build` passes

## Example in this repo

`packages/shared/src/schemas/common.ts` (`HealthResponseSchema`, FR-SYS-001) with its tests in
`common.test.ts`; error contract in `packages/shared/src/errors.ts`.
