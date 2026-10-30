import { z } from 'zod';
import { IsoTimestampSchema, UuidSchema } from './common.js';

export const ProjectRoleSchema = z.enum(['OWNER', 'MEMBER']);
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;

export const ProjectStatusSchema = z.enum(['ACTIVE', 'ARCHIVED']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().max(1000).nullish(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(1000).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

export const ListProjectsQuerySchema = z.object({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

export const ProjectSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatusSchema,
  ownerId: UuidSchema,
  archivedAt: IsoTimestampSchema.nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectMemberSchema = z.object({
  userId: UuidSchema,
  name: z.string(),
  email: z.string(),
  role: ProjectRoleSchema,
});

export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

// FR-PROJ-002: the project plus its members, and the caller's role.
export const ProjectDetailSchema = ProjectSchema.extend({
  members: z.array(ProjectMemberSchema),
  myRole: ProjectRoleSchema,
});

export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const ProjectListItemSchema = ProjectSchema.extend({ myRole: ProjectRoleSchema });

export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;

export const ProjectListResponseSchema = z.object({ items: z.array(ProjectListItemSchema) });

export const AddMemberSchema = z.object({
  email: z.email().max(255),
  role: ProjectRoleSchema.default('MEMBER'),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;
