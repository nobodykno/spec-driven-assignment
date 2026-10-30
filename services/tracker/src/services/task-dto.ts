import type { Task as TaskDto } from '@app/shared';
import type { TaskRecord } from './task-access.js';

type DtoSource = Pick<TaskRecord, 'assignee' | 'createdBy'> &
  Omit<TaskRecord, 'project' | 'assignee' | 'createdBy'>;

// SDS §6: dates are ISO strings, dueDate is YYYY-MM-DD.
export function toTaskDto(task: DtoSource): TaskDto {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    assignee: task.assignee ? { id: task.assignee.id, name: task.assignee.name } : null,
    createdBy: { id: task.createdBy.id, name: task.createdBy.name },
    archivedAt: task.archivedAt ? task.archivedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
