import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  applyFilterPatch,
  parseTaskFilters,
  type FilterPatch,
  type TaskFilters,
} from './task-filters.ts';

export interface UseTaskFilters {
  filters: TaskFilters;
  setFilters: (patch: FilterPatch) => void;
}

// FR-UI-005: filters, sort and page live in the URL search params (SDS §9.2).
export function useTaskFilters(): UseTaskFilters {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseTaskFilters(params), [params]);
  const setFilters = useCallback(
    (patch: FilterPatch) => setParams((current) => applyFilterPatch(current, patch)),
    [setParams],
  );
  return { filters, setFilters };
}
