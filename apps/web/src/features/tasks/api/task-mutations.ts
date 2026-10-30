import {
  TaskSchema,
  type AssignTaskInput,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
} from '@app/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api-client.ts';

// Any task change also adds an activity entry, so both caches are refreshed.
function useRefreshingMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Task>,
): UseMutationResult<Task, Error, TInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });
}

export function useCreateTaskMutation(
  projectId: string,
): UseMutationResult<Task, Error, CreateTaskInput> {
  return useRefreshingMutation((input: CreateTaskInput) =>
    apiFetch(`/projects/${projectId}/tasks`, { method: 'POST', body: input, parser: TaskSchema }),
  );
}

export function useUpdateTaskMutation(
  taskId: string,
): UseMutationResult<Task, Error, UpdateTaskInput> {
  return useRefreshingMutation((input: UpdateTaskInput) =>
    apiFetch(`/tasks/${taskId}`, { method: 'PATCH', body: input, parser: TaskSchema }),
  );
}

export function useAssignTaskMutation(
  taskId: string,
): UseMutationResult<Task, Error, AssignTaskInput> {
  return useRefreshingMutation((input: AssignTaskInput) =>
    apiFetch(`/tasks/${taskId}/assignee`, { method: 'PATCH', body: input, parser: TaskSchema }),
  );
}

export function useChangeStatusMutation(
  taskId: string,
): UseMutationResult<Task, Error, TaskStatus> {
  return useRefreshingMutation((status: TaskStatus) =>
    apiFetch(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { status },
      parser: TaskSchema,
    }),
  );
}

export function useArchiveTaskMutation(taskId: string): UseMutationResult<Task, Error, void> {
  return useRefreshingMutation(() =>
    apiFetch(`/tasks/${taskId}/archive`, { method: 'POST', parser: TaskSchema }),
  );
}
