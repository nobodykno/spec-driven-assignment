import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  update: vi.fn(),
  task: { current: undefined as unknown },
}));

vi.mock('@app/database', () => ({
  Task: { create: vi.fn() },
  Project: {},
  ProjectMember: { count: vi.fn(async () => 1), findOne: vi.fn() },
  User: {},
  getSequelize: () => ({ transaction: async (work: (tx: object) => unknown) => work({}) }),
}));

vi.mock('./task-access.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./task-access.js')>()),
  findTaskForMember: vi.fn(async () => mocks.task.current),
  isProjectMember: vi.fn(async () => false),
}));

const { TaskService } = await import('./task-service.js');

function taskRecord(status: string, archivedAt: Date | null = null): unknown {
  const task = {
    id: 't1',
    projectId: 'p1',
    title: 'T',
    description: null,
    status,
    priority: 'MEDIUM',
    dueDate: null,
    assigneeId: null,
    archivedAt,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: { status: 'ACTIVE' },
    assignee: null,
    createdBy: { id: 'u1', name: 'Ada' },
    update: mocks.update,
  };
  return task;
}

describe('TaskService', () => {
  beforeEach(() => {
    mocks.record.mockReset();
    mocks.update.mockReset();
  });

  it('FR-TASK-005: an allowed transition updates the status and records activity', async () => {
    mocks.task.current = taskRecord('TODO');
    const service = new TaskService({ record: mocks.record });
    await service.changeStatus('u1', 't1', 'IN_PROGRESS');
    expect(mocks.update).toHaveBeenCalledWith({ status: 'IN_PROGRESS' }, expect.anything());
    expect(mocks.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'TASK_STATUS_CHANGED',
        metadata: { from: 'TODO', to: 'IN_PROGRESS' },
      }),
    );
  });

  it('FR-TASK-005: TODO to DONE is rejected without writing', async () => {
    mocks.task.current = taskRecord('TODO');
    const service = new TaskService({ record: mocks.record });
    await expect(service.changeStatus('u1', 't1', 'DONE')).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it('FR-TASK-006: an archived task cannot be modified', async () => {
    mocks.task.current = taskRecord('TODO', new Date());
    const service = new TaskService({ record: mocks.record });
    await expect(service.update('u1', 't1', { title: 'x' })).rejects.toMatchObject({
      code: 'TASK_ARCHIVED',
    });
  });

  it('FR-TASK-004: assigning to a non-member is rejected with ASSIGNEE_NOT_MEMBER', async () => {
    mocks.task.current = taskRecord('TODO');
    const service = new TaskService({ record: mocks.record });
    await expect(service.assign('u1', 't1', 'someone')).rejects.toMatchObject({
      code: 'ASSIGNEE_NOT_MEMBER',
    });
  });
});
