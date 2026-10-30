import { Task, User, getSequelize, type Transaction } from '@app/database';
import {
  AppError,
  buildPaginated,
  type CreateTaskInput,
  type Paginated,
  type Task as TaskDto,
  type TaskListQuery,
  type TaskStatus,
  type UpdateTaskInput,
} from '@app/shared';
import { noopActivityHook, type ActivityHook } from './activity-hook.js';
import {
  assertWritable,
  findMembership,
  findTaskForMember,
  isProjectMember,
  type TaskRecord,
} from './task-access.js';
import { toTaskDto } from './task-dto.js';
import { buildTaskOrder, buildTaskWhere } from './task-query.js';
import { assertDueDateNotPast, assertTransition } from './task-rules.js';

type Change = { from: unknown; to: unknown };
type Mutation = (task: TaskRecord, tx: Transaction) => Promise<void>;

const UPDATABLE_FIELDS = ['title', 'description', 'priority', 'dueDate'] as const;

function diffUpdate(task: TaskRecord, input: UpdateTaskInput): Record<string, Change> {
  const changes: Record<string, Change> = {};
  for (const field of UPDATABLE_FIELDS) {
    const next = input[field];
    const current = task[field] ?? null;
    if (next !== undefined && (next ?? null) !== current) {
      changes[field] = { from: current, to: next ?? null };
    }
  }
  return changes;
}

export class TaskService {
  constructor(private readonly activity: ActivityHook = noopActivityHook) {}

  // FR-TASK-001
  async create(userId: string, projectId: string, input: CreateTaskInput): Promise<TaskDto> {
    const { project } = await findMembership(projectId, userId);
    assertWritable(project);
    assertDueDateNotPast(input.dueDate, new Date());
    if (input.assigneeId && !(await isProjectMember(projectId, input.assigneeId))) {
      throw new AppError('ASSIGNEE_NOT_MEMBER', 400, 'Assignee must be a project member');
    }
    return getSequelize().transaction(async (tx) => {
      const task = await Task.create(
        {
          projectId,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          dueDate: input.dueDate ?? null,
          assigneeId: input.assigneeId ?? null,
          createdById: userId,
        },
        { transaction: tx },
      );
      await this.activity.record(tx, {
        taskId: task.id,
        actorId: userId,
        action: 'TASK_CREATED',
        metadata: { title: task.title, status: 'TODO', priority: input.priority },
      });
      return toTaskDto(await findTaskForMember(task.id, userId, tx));
    });
  }

  // FR-FILT-001..003: member-only, filtered, sorted and paginated task list.
  async list(userId: string, projectId: string, query: TaskListQuery): Promise<Paginated<TaskDto>> {
    await findMembership(projectId, userId);
    const { rows, count } = await Task.findAndCountAll({
      where: buildTaskWhere(projectId, userId, query),
      include: [
        { model: User, as: 'assignee', required: false },
        { model: User, as: 'createdBy', required: true },
      ],
      order: buildTaskOrder(query.sort, query.order),
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
    const items = rows.map((row) => toTaskDto(row as TaskRecord));
    return buildPaginated(items, count, query.page, query.pageSize);
  }

  // FR-TASK-002
  async get(userId: string, taskId: string): Promise<TaskDto> {
    return toTaskDto(await findTaskForMember(taskId, userId));
  }

  // FR-TASK-003
  async update(userId: string, taskId: string, input: UpdateTaskInput): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (task, tx) => {
      const changes = diffUpdate(task, input);
      if (Object.keys(changes).length === 0) {
        return;
      }
      await task.update(
        {
          title: input.title ?? task.title,
          description: input.description === undefined ? task.description : input.description,
          priority: input.priority ?? task.priority,
          dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
        },
        { transaction: tx },
      );
      await this.record(tx, task, userId, 'TASK_UPDATED', { changes });
    });
  }

  // FR-TASK-004
  async assign(userId: string, taskId: string, assigneeId: string | null): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (task, tx) => {
      if (assigneeId && !(await isProjectMember(task.projectId, assigneeId, tx))) {
        throw new AppError('ASSIGNEE_NOT_MEMBER', 400, 'Assignee must be a project member');
      }
      const from = task.assigneeId ?? null;
      await task.update({ assigneeId }, { transaction: tx });
      await this.record(tx, task, userId, 'TASK_ASSIGNED', { from, to: assigneeId });
    });
  }

  // FR-TASK-005
  async changeStatus(userId: string, taskId: string, status: TaskStatus): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (task, tx) => {
      const from = task.status ?? 'TODO';
      assertTransition(from, status);
      await task.update({ status }, { transaction: tx });
      await this.record(tx, task, userId, 'TASK_STATUS_CHANGED', { from, to: status });
    });
  }

  // FR-TASK-006
  async archive(userId: string, taskId: string): Promise<TaskDto> {
    return this.mutate(userId, taskId, async (task, tx) => {
      await task.update({ archivedAt: new Date() }, { transaction: tx });
      await this.record(tx, task, userId, 'TASK_ARCHIVED', {});
    });
  }

  // SDS §5.5: the change and its activity entry share one transaction.
  private async mutate(userId: string, taskId: string, apply: Mutation): Promise<TaskDto> {
    return getSequelize().transaction(async (tx) => {
      const task = await findTaskForMember(taskId, userId, tx);
      assertWritable(task.project, task);
      await apply(task, tx);
      return toTaskDto(await findTaskForMember(taskId, userId, tx));
    });
  }

  private record(
    tx: Transaction,
    task: TaskRecord,
    actorId: string,
    action: Parameters<ActivityHook['record']>[1]['action'],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    return this.activity.record(tx, { taskId: task.id, actorId, action, metadata });
  }
}
