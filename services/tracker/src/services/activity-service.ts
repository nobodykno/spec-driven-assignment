import { Activity, User, type Transaction } from '@app/database';
import {
  buildPaginated,
  type Activity as ActivityDto,
  type Paginated,
  type PaginationQuery,
} from '@app/shared';
import type { ActivityEvent, ActivityHook } from './activity-hook.js';
import { findTaskForMember } from './task-access.js';

function toActivityDto(activity: Activity): ActivityDto {
  return {
    id: activity.id,
    taskId: activity.taskId,
    actor: { id: activity.actorId, name: activity.actor?.name ?? '' },
    action: activity.action,
    metadata: activity.metadata ?? {},
    createdAt: activity.createdAt.toISOString(),
  };
}

// SDS §8: append-only. Only `record` (inside the caller's transaction) and `listForTask` exist.
export class ActivityService implements ActivityHook {
  // FR-ACT-001: a failing insert rejects, which rolls back the task change in the same transaction.
  async record(tx: Transaction, event: ActivityEvent): Promise<void> {
    await Activity.create(
      {
        taskId: event.taskId,
        actorId: event.actorId,
        action: event.action,
        metadata: event.metadata,
      },
      { transaction: tx },
    );
  }

  // FR-ACT-002: newest first, members only.
  async listForTask(
    userId: string,
    taskId: string,
    query: PaginationQuery,
  ): Promise<Paginated<ActivityDto>> {
    await findTaskForMember(taskId, userId);
    const { rows, count } = await Activity.findAndCountAll({
      where: { taskId },
      include: [{ model: User, as: 'actor', required: true }],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
    return buildPaginated(rows.map(toActivityDto), count, query.page, query.pageSize);
  }
}
