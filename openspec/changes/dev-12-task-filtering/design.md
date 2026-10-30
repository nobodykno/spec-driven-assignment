# Design: DEV-12 Task filtering

## Context

Follows SDS §5.3, §6.1–6.3. Extends `TaskService` from DEV-11 with `listForProject`.

## Decisions

- **D1 Query parsing.** `TaskListQuerySchema` (strict: unknown params rejected → 400 `VALIDATION_ERROR`) parses `status`/`priority` as comma lists of enum values, `assigneeId` as UUID | `me` | `none`, `dueFrom`/`dueTo` ISO dates, `includeArchived`, `sort`, `order`, `page` (≥ 1), `pageSize` (1–100, default 20).
- **D2 Where clause.** Filters AND together; `status`/`priority` lists use `Op.in` (OR within a filter); `me` resolves to the caller's id; `none` → `assigneeId IS NULL`; due range uses `Op.gte/lte`; archived tasks excluded unless `includeArchived=true`. All values go through Sequelize operators (NFR-SEC-004).
- **D3 Sorting.** `dueDate` asc/desc with `NULLS LAST` in both directions; `priority` uses a `CASE` ordering (URGENT 4 … LOW 1) so "descending" is URGENT first; `createdAt`/`updatedAt` plain. Default `createdAt DESC`; `id` as tie-breaker for stable pages.
- **D4 Pagination.** `findAndCountAll` with `limit/offset` (`distinct`); response `{ items, meta { page, pageSize, total, totalPages } }`.
- **D5 Authorization.** The caller must be a project member (404 otherwise) — via `findMembership` from DEV-11.
- **D6 Indexes.** The four DEV-11 indexes cover filter/sort columns (NFR-PERF-002).

## Docs checked

Sequelize v6 `findAndCountAll`, `Sequelize.literal` ordering: recorded at apply time via Context7.
