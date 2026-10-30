import { z } from 'zod';
import {
  IsoTimestampSchema,
  PaginationQuerySchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';

export const ActivityActionSchema = z.enum([
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_ARCHIVED',
]);

export type ActivityAction = z.infer<typeof ActivityActionSchema>;

export const ListActivityQuerySchema = PaginationQuerySchema;

export const ActivitySchema = z.object({
  id: UuidSchema,
  taskId: UuidSchema,
  actor: z.object({ id: UuidSchema, name: z.string() }),
  action: ActivityActionSchema,
  metadata: z.record(z.string(), z.unknown()),
  createdAt: IsoTimestampSchema,
});

export type Activity = z.infer<typeof ActivitySchema>;

export const ActivityListResponseSchema = paginatedSchema(ActivitySchema);
export type ActivityListResponse = z.infer<typeof ActivityListResponseSchema>;
