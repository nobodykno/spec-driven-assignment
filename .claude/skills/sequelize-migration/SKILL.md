---
name: sequelize-migration
description: Create a new reversible Sequelize migration in packages/database (tables, columns, indexes, constraints) and prove it with migrate + undo. Use when a ticket needs a schema change, a new table or index, or when the user says "add a migration". Never edit an applied migration.
---

# Sequelize migration (`packages/database`, SDS §5.2–§5.4)

The schema changes only through migrations, run by sequelize-cli. `sync()` is never used outside
tests. A migration that is already applied is **never edited**: any change needs a new migration.

## Procedure

1. **Read the target schema:** the table, columns, types, constraints and indexes from SDS §5.2
   (tables) and §5.3 (indexes), plus the FRS IDs of the ticket. Do not add columns the SDS
   doesn't list. If one is needed, update the SDS in the same change and say so in the proposal.
2. **Check what is applied:** `git log --oneline -- packages/database/migrations` and
   `ls packages/database/migrations`. If the change would alter a migration that is already on
   `main`, write a **new** migration instead.
3. **Create the file:** `packages/database/migrations/<YYYYMMDDHHmmss>-<kebab-description>.cjs`,
   using the UTC timestamp of now. It is `.cjs` because the package is ESM and sequelize-cli
   loads migrations with `require`.
4. **Write `up` and `down`:**
   ```js
   'use strict';

   /** <FRS IDs> — <what and why> (SDS §5.x) */
   module.exports = {
     async up(queryInterface, Sequelize) {
       await queryInterface.sequelize.transaction(async (transaction) => {
         await queryInterface.createTable('<table>', { /* columns from SDS §5.2 */ }, { transaction });
         await queryInterface.addIndex('<table>', ['<column>'], { transaction });
       });
     },
     async down(queryInterface) {
       await queryInterface.dropTable('<table>');
     },
   };
   ```
   - Use snake_case table and column names (SDS §5.2), `Sequelize.UUID` primary keys with a
     default `Sequelize.literal('gen_random_uuid()')`, and `created_at` / `updated_at` timestamps.
   - Add foreign keys with `onDelete` exactly as SDS §5.2 says, and the indexes from §5.3.
   - `down` must undo **everything** `up` did, in reverse order.
5. **Prove it locally** (Postgres from `pnpm db:up`):
   - `pnpm db:migrate`: applies it
   - `docker compose exec -T postgres psql -U dev -d tracker -c '\d <table>'`: shows the expected columns and indexes
   - `pnpm db:migrate:undo`: reverts it; the same `\d` now reports "Did not find any relation"
   - `pnpm db:migrate` again, so the local database matches the branch
6. **Models:** add or update the model in `packages/database/src/models/` to match the migration.
   Export it from the package index. Only services import it (ESLint enforces this for routes and
   controllers).
7. **Verify:** `pnpm --filter @app/database test && pnpm lint`.

## Checklist

- [ ] It is a new file with a timestamp prefix; no migration already on `main` was changed
- [ ] `up` and `down` are both present; `down` fully reverses `up`; multi-statement `up` runs in a transaction
- [ ] Columns, constraints and indexes match SDS §5.2 / §5.3; snake_case names
- [ ] `migrate` → `undo` → `migrate` was run locally and the result checked with `psql`
- [ ] No `sync()`, no data from real people (seeders use synthetic data only)
- [ ] The model matches the migration and is used only from services

## Example in this repo

`packages/database/config/config.cjs` (connection from `DATABASE_URL`), `.sequelizerc`
(paths), and the root scripts `db:migrate` / `db:migrate:undo`. The first real migrations come with
DEV-1006 (`users`, `refresh_tokens`).
