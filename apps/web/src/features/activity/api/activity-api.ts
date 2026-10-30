import { ActivityListResponseSchema, type ActivityListResponse } from '@app/shared';
import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api-client.ts';

const ACTIVITY_PAGE_SIZE = 20;

export function useActivityQuery(
  taskId: string,
  page: number,
): UseQueryResult<ActivityListResponse> {
  return useQuery({
    queryKey: ['activity', taskId, page],
    queryFn: () =>
      apiFetch(`/tasks/${taskId}/activity?page=${page}&pageSize=${ACTIVITY_PAGE_SIZE}`, {
        parser: ActivityListResponseSchema,
      }),
    placeholderData: keepPreviousData,
  });
}
