import { z } from 'zod';
import {
  IsoTimestampSchema,
  PaginationQuerySchema,
  UuidSchema,
  paginatedSchema,
} from './common.js';

export const CommentBodySchema = z.string().trim().min(1, 'Comment is required').max(2000);

export const CreateCommentSchema = z.object({ body: CommentBodySchema });
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = CreateCommentSchema;
export type UpdateCommentInput = CreateCommentInput;

export const ListCommentsQuerySchema = PaginationQuerySchema;

export const CommentSchema = z.object({
  id: UuidSchema,
  taskId: UuidSchema,
  author: z.object({ id: UuidSchema, name: z.string() }),
  body: z.string(),
  editedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
});

export type Comment = z.infer<typeof CommentSchema>;

export const CommentListResponseSchema = paginatedSchema(CommentSchema);
export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;
