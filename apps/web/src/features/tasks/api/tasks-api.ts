import { TaskListResponseSchema, TaskSchema, type Task, type TaskListResponse } from '@app/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api-client.ts';
import { toApiQueryString, type TaskFilters } from '../lib/task-filters.ts';

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string, query: string) => ['tasks', 'list', projectId, query] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
};

export function useTasksQuery(
  projectId: string,
  filters: TaskFilters,
): UseQueryResult<TaskListResponse> {
  const query = toApiQueryString(filters);
  return useQuery({
    queryKey: taskKeys.list(projectId, query),
    queryFn: () =>
      apiFetch(`/projects/${projectId}/tasks?${query}`, { parser: TaskListResponseSchema }),
    placeholderData: keepPreviousData,
  });
}

export function useTaskQuery(taskId: string): UseQueryResult<Task> {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => apiFetch(`/tasks/${taskId}`, { parser: TaskSchema }),
  });
}
