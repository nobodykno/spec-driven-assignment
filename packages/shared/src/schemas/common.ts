import { z } from 'zod';

// FR-SYS-001: body returned by every GET /health endpoint.
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const UuidSchema = z.uuid();

export const IsoTimestampSchema = z.string();

// SDS §6.1 / FR-FILT-003: page (default 1), pageSize (default 20, max 100).
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export function paginatedSchema<T extends z.ZodType>(
  item: T,
): z.ZodObject<{ items: z.ZodArray<T>; meta: typeof PaginationMetaSchema }> {
  return z.object({ items: z.array(item), meta: PaginationMetaSchema });
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return { items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
}
