import { z } from 'zod';
import {
  IsoTimestampSchema,
  PaginationQuerySchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';

export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// FR-TASK-005: allowed status transitions.
export const ALLOWED_TRANSITIONS: Readonly<Record<TaskStatus, readonly TaskStatus[]>> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW'],
  IN_REVIEW: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS'],
};

export function isAllowedTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

const DueDateSchema = z.iso.date();

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(5000).nullish(),
  priority: TaskPrioritySchema.default('MEDIUM'),
  dueDate: DueDateSchema.nullish(),
  assigneeId: UuidSchema.nullish(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(5000).nullish(),
    priority: TaskPrioritySchema.optional(),
    dueDate: DueDateSchema.nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const AssignTaskSchema = z.object({ assigneeId: UuidSchema.nullable() });
export type AssignTaskInput = z.infer<typeof AssignTaskSchema>;

export const ChangeStatusSchema = z.object({ status: TaskStatusSchema });
export type ChangeStatusInput = z.infer<typeof ChangeStatusSchema>;

const UserRefSchema = z.object({ id: UuidSchema, name: z.string() });

export const TaskSchema = z.object({
  id: UuidSchema,
  projectId: UuidSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.string().nullable(),
  assignee: UserRefSchema.nullable(),
  createdBy: UserRefSchema,
  archivedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type Task = z.infer<typeof TaskSchema>;

const CsvSchema = z.string().transform((value) => value.split(',').map((part) => part.trim()));

const BooleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true');

// SDS §6.3: unknown parameters are rejected.
export const TaskListQuerySchema = z.strictObject({
  status: CsvSchema.pipe(z.array(TaskStatusSchema).min(1)).optional(),
  priority: CsvSchema.pipe(z.array(TaskPrioritySchema).min(1)).optional(),
  assigneeId: z.union([UuidSchema, z.enum(['me', 'none'])]).optional(),
  dueFrom: DueDateSchema.optional(),
  dueTo: DueDateSchema.optional(),
  includeArchived: BooleanQuerySchema.default(false),
  sort: z.enum(['dueDate', 'priority', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  ...PaginationQuerySchema.shape,
});

export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

export const TaskListResponseSchema = paginatedSchema(TaskSchema);
export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;
