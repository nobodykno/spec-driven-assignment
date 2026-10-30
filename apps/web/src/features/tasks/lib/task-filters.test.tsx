import { describe, expect, it } from 'vitest';
import { applyFilterPatch, parseTaskFilters, toApiQueryString } from './task-filters.ts';

describe('task filters in the URL', () => {
  it('FR-UI-005: parses status, priority, sort and page from the URL', () => {
    const filters = parseTaskFilters(
      new URLSearchParams('status=TODO,IN_PROGRESS&priority=HIGH&sort=dueDate&order=asc&page=2'),
    );
    expect(filters.status).toEqual(['TODO', 'IN_PROGRESS']);
    expect(filters.priority).toEqual(['HIGH']);
    expect(filters.sort).toBe('dueDate');
    expect(filters.order).toBe('asc');
    expect(filters.page).toBe(2);
  });

  it('FR-UI-005: invalid values fall back to defaults instead of failing', () => {
    const filters = parseTaskFilters(new URLSearchParams('pageSize=500&sort=bogus&status=NOPE'));
    expect(filters.pageSize).toBe(20);
    expect(filters.sort).toBe('createdAt');
    expect(filters.status).toBeUndefined();
  });

  it('FR-UI-005: changing a filter resets the page to 1', () => {
    const next = applyFilterPatch(new URLSearchParams('page=3&priority=HIGH'), { status: 'TODO' });
    expect(next.get('status')).toBe('TODO');
    expect(next.has('page')).toBe(false);
    expect(next.get('priority')).toBe('HIGH');
  });

  it('FR-UI-005: changing the page keeps the page and clearing a filter removes it', () => {
    const paged = applyFilterPatch(new URLSearchParams('status=TODO'), { page: '2' });
    expect(paged.get('page')).toBe('2');
    const cleared = applyFilterPatch(paged, { status: '' });
    expect(cleared.has('status')).toBe(false);
  });

  it('FR-UI-005: builds the API query string from the filters', () => {
    const query = toApiQueryString(
      parseTaskFilters(new URLSearchParams('status=TODO&assigneeId=me')),
    );
    expect(query).toContain('status=TODO');
    expect(query).toContain('assigneeId=me');
    expect(query).toContain('pageSize=20');
  });
});
