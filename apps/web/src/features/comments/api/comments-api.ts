import {
  CommentListResponseSchema,
  CommentSchema,
  type Comment,
  type CommentListResponse,
} from '@app/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiFetch, apiRequest } from '../../../lib/api-client.ts';

const COMMENT_PAGE_SIZE = 20;

export const commentKeys = {
  all: ['comments'] as const,
  list: (taskId: string, page: number) => ['comments', taskId, page] as const,
};

export function useCommentsQuery(
  taskId: string,
  page: number,
): UseQueryResult<CommentListResponse> {
  return useQuery({
    queryKey: commentKeys.list(taskId, page),
    queryFn: () =>
      apiFetch(`/tasks/${taskId}/comments?page=${page}&pageSize=${COMMENT_PAGE_SIZE}`, {
        parser: CommentListResponseSchema,
      }),
    placeholderData: keepPreviousData,
  });
}

function useCommentMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
): UseMutationResult<TResult, Error, TInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.all }),
  });
}

export function useAddCommentMutation(taskId: string): UseMutationResult<Comment, Error, string> {
  return useCommentMutation((body: string) =>
    apiFetch(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: { body },
      parser: CommentSchema,
    }),
  );
}

export function useEditCommentMutation(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; body: string }
> {
  return useCommentMutation(({ commentId, body }: { commentId: string; body: string }) =>
    apiFetch(`/comments/${commentId}`, { method: 'PATCH', body: { body }, parser: CommentSchema }),
  );
}

export function useDeleteCommentMutation(): UseMutationResult<void, Error, string> {
  return useCommentMutation((commentId: string) =>
    apiRequest(`/comments/${commentId}`, { method: 'DELETE' }),
  );
}
