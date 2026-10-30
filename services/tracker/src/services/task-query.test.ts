import { describe, expect, it } from 'vitest';

// Minimal stand-ins for the sequelize helpers so the builders can be inspected as plain data.
import { vi } from 'vitest';

vi.mock('@app/database', () => ({
  Op: { and: Symbol('and'), in: Symbol('in'), gte: Symbol('gte'), lte: Symbol('lte') },
  literal: (sql: string) => ({ literal: sql }),
}));

const { Op } = await import('@app/database');
const { buildTaskOrder, buildTaskWhere } = await import('./task-query.js');
const { TaskListQuerySchema } = await import('@app/shared');

const PROJECT = 'p1';
const USER = 'u1';

function conditions(query: Record<string, string>): unknown[] {
  const where = buildTaskWhere(PROJECT, USER, TaskListQuerySchema.parse(query)) as Record<
    symbol,
    unknown[]
  >;
  return where[Op.and] as unknown[];
}

describe('buildTaskWhere', () => {
  it('FR-FILT-001: status and priority lists become IN conditions combined with AND', () => {
    const result = conditions({ status: 'TODO,IN_PROGRESS', priority: 'HIGH' });
    expect(result).toContainEqual({ status: { [Op.in]: ['TODO', 'IN_PROGRESS'] } });
    expect(result).toContainEqual({ priority: { [Op.in]: ['HIGH'] } });
    expect(result).toContainEqual({ projectId: PROJECT });
  });

  it('FR-FILT-001: assigneeId=me resolves to the caller and none to NULL', () => {
    expect(conditions({ assigneeId: 'me' })).toContainEqual({ assigneeId: USER });
    expect(conditions({ assigneeId: 'none' })).toContainEqual({ assigneeId: null });
  });

  it('FR-FILT-001: archived tasks are hidden unless includeArchived=true', () => {
    expect(conditions({})).toContainEqual({ archivedAt: null });
    expect(conditions({ includeArchived: 'true' })).not.toContainEqual({ archivedAt: null });
  });

  it('FR-FILT-001: a due range uses gte and lte', () => {
    const result = conditions({ dueFrom: '2030-01-01', dueTo: '2030-02-01' });
    expect(result).toContainEqual({
      dueDate: { [Op.gte]: '2030-01-01', [Op.lte]: '2030-02-01' },
    });
  });
});

function head(order: unknown): { literal: string } | string[] {
  return (order as unknown[])[0] as { literal: string } | string[];
}

describe('buildTaskOrder', () => {
  it('FR-FILT-002: the default order is createdAt descending', () => {
    expect(head(buildTaskOrder('createdAt', 'desc'))).toEqual(['createdAt', 'DESC']);
  });

  it('FR-FILT-002: due date sorting puts tasks without a due date last', () => {
    const first = head(buildTaskOrder('dueDate', 'asc')) as { literal: string };
    expect(first.literal).toContain('NULLS LAST');
    expect(first.literal).toContain('ASC');
  });

  it('FR-FILT-002: priority descending ranks URGENT first', () => {
    const first = head(buildTaskOrder('priority', 'desc')) as { literal: string };
    expect(first.literal).toContain("WHEN 'URGENT' THEN 4");
    expect(first.literal).toContain('DESC');
  });
});
