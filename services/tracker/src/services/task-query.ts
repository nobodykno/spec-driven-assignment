import { Op, literal, type Order, type WhereOptions } from '@app/database';
import type { TaskListQuery } from '@app/shared';

type SortDirection = 'ASC' | 'DESC';

// Stable page boundaries when the sort column has ties.
const TIE_BREAKER: [string, SortDirection] = ['id', 'ASC'];

function direction(order: TaskListQuery['order']): SortDirection {
  return order === 'asc' ? 'ASC' : 'DESC';
}

function assigneeCondition(
  assigneeId: NonNullable<TaskListQuery['assigneeId']>,
  userId: string,
): WhereOptions {
  if (assigneeId === 'none') {
    return { assigneeId: null };
  }
  return { assigneeId: assigneeId === 'me' ? userId : assigneeId };
}

function dueRange(dueFrom?: string, dueTo?: string): WhereOptions {
  return {
    dueDate: {
      ...(dueFrom ? { [Op.gte]: dueFrom } : {}),
      ...(dueTo ? { [Op.lte]: dueTo } : {}),
    },
  };
}

// FR-FILT-001: filters combine with AND, values inside one filter with OR (IN).
// Every value goes through Sequelize operators, never string-built SQL (NFR-SEC-004).
export function buildTaskWhere(
  projectId: string,
  userId: string,
  query: TaskListQuery,
): WhereOptions {
  const conditions: WhereOptions[] = [{ projectId }];
  if (!query.includeArchived) {
    conditions.push({ archivedAt: null });
  }
  if (query.status) {
    conditions.push({ status: { [Op.in]: query.status } });
  }
  if (query.priority) {
    conditions.push({ priority: { [Op.in]: query.priority } });
  }
  if (query.assigneeId) {
    conditions.push(assigneeCondition(query.assigneeId, userId));
  }
  if (query.dueFrom || query.dueTo) {
    conditions.push(dueRange(query.dueFrom, query.dueTo));
  }
  return { [Op.and]: conditions };
}

// FR-FILT-002: `sort` and `order` are validated enums, so the literals below carry no user input.
// Priority sorts by rank so "desc" is URGENT, HIGH, MEDIUM, LOW; due dates without a value go last.
export function buildTaskOrder(sort: TaskListQuery['sort'], order: TaskListQuery['order']): Order {
  const dir = direction(order);
  if (sort === 'dueDate') {
    return [literal(`"Task"."due_date" ${dir} NULLS LAST`), TIE_BREAKER];
  }
  if (sort === 'priority') {
    const rank =
      'CASE "Task"."priority" WHEN \'URGENT\' THEN 4 WHEN \'HIGH\' THEN 3 ' +
      `WHEN 'MEDIUM' THEN 2 ELSE 1 END ${dir}`;
    return [literal(rank), TIE_BREAKER];
  }
  return [[sort, dir], TIE_BREAKER];
}
