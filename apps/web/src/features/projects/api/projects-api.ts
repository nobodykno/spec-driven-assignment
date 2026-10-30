import {
  ProjectDetailSchema,
  ProjectListResponseSchema,
  ProjectMemberSchema,
  type AddMemberInput,
  type CreateProjectInput,
  type ProjectDetail,
  type ProjectListItem,
  type ProjectMember,
  type UpdateProjectInput,
} from '@app/shared';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiFetch, apiRequest } from '../../../lib/api-client.ts';

export const projectKeys = {
  all: ['projects'] as const,
  list: (includeArchived: boolean) => ['projects', 'list', includeArchived] as const,
  detail: (projectId: string) => ['projects', 'detail', projectId] as const,
};

export function useProjectsQuery(includeArchived: boolean): UseQueryResult<ProjectListItem[]> {
  return useQuery({
    queryKey: projectKeys.list(includeArchived),
    queryFn: async () => {
      const query = includeArchived ? '?includeArchived=true' : '';
      const result = await apiFetch(`/projects${query}`, { parser: ProjectListResponseSchema });
      return result.items;
    },
  });
}

export function useProjectQuery(projectId: string): UseQueryResult<ProjectDetail> {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => apiFetch(`/projects/${projectId}`, { parser: ProjectDetailSchema }),
  });
}

function useInvalidatingMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
): UseMutationResult<TResult, Error, TInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useCreateProjectMutation(): UseMutationResult<
  ProjectDetail,
  Error,
  CreateProjectInput
> {
  return useInvalidatingMutation((input: CreateProjectInput) =>
    apiFetch('/projects', { method: 'POST', body: input, parser: ProjectDetailSchema }),
  );
}

export function useUpdateProjectMutation(
  projectId: string,
): UseMutationResult<ProjectDetail, Error, UpdateProjectInput> {
  return useInvalidatingMutation((input: UpdateProjectInput) =>
    apiFetch(`/projects/${projectId}`, {
      method: 'PATCH',
      body: input,
      parser: ProjectDetailSchema,
    }),
  );
}

export function useArchiveProjectMutation(): UseMutationResult<ProjectDetail, Error, string> {
  return useInvalidatingMutation((projectId: string) =>
    apiFetch(`/projects/${projectId}/archive`, { method: 'POST', parser: ProjectDetailSchema }),
  );
}

export function useAddMemberMutation(
  projectId: string,
): UseMutationResult<ProjectMember, Error, AddMemberInput> {
  return useInvalidatingMutation((input: AddMemberInput) =>
    apiFetch(`/projects/${projectId}/members`, {
      method: 'POST',
      body: input,
      parser: ProjectMemberSchema,
    }),
  );
}

export function useRemoveMemberMutation(projectId: string): UseMutationResult<void, Error, string> {
  return useInvalidatingMutation((userId: string) =>
    apiRequest(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),
  );
}
