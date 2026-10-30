import { TaskListQuerySchema, type TaskListQuery } from '@app/shared';

const FILTER_KEYS = [
  'status',
  'priority',
  'assigneeId',
  'dueFrom',
  'dueTo',
  'includeArchived',
  'sort',
  'order',
  'page',
  'pageSize',
] as const;

export type TaskFilters = TaskListQuery;
export type FilterPatch = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

const DEFAULTS: TaskFilters = TaskListQuerySchema.parse({});

// FR-UI-005: the URL is the source of truth. Invalid values are ignored one by one, so a
// hand-edited URL falls back to defaults instead of breaking the page.
export function parseTaskFilters(params: URLSearchParams): TaskFilters {
  const valid: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = params.get(key);
    if (value && TaskListQuerySchema.safeParse({ [key]: value }).success) {
      valid[key] = value;
    }
  }
  return TaskListQuerySchema.parse(valid);
}

// Next URL search params after a filter change; defaults are left out and the page resets to 1
// unless the page itself is being changed.
export function applyFilterPatch(current: URLSearchParams, patch: FilterPatch): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === '' || value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  if (!('page' in patch)) {
    next.delete('page');
  }
  return next;
}

// FR-FILT-001..003: the API query string for the current filters.
export function toApiQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.status) {
    params.set('status', filters.status.join(','));
  }
  if (filters.priority) {
    params.set('priority', filters.priority.join(','));
  }
  (['assigneeId', 'dueFrom', 'dueTo'] as const).forEach((key) => {
    const value = filters[key];
    if (value) {
      params.set(key, value);
    }
  });
  if (filters.includeArchived) {
    params.set('includeArchived', 'true');
  }
  params.set('sort', filters.sort);
  params.set('order', filters.order);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return params.toString();
}

export { DEFAULTS as DEFAULT_TASK_FILTERS };
