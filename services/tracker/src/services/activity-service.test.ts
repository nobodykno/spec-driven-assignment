import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());

vi.mock('@app/database', () => ({ Activity: { create }, User: {} }));
vi.mock('./task-access.js', () => ({ findTaskForMember: vi.fn() }));

const { ActivityService } = await import('./activity-service.js');

describe('ActivityService.record', () => {
  beforeEach(() => {
    create.mockReset();
  });

  it('FR-ACT-001: stores one entry inside the caller transaction', async () => {
    const tx = { id: 'tx' };
    await new ActivityService().record(tx as never, {
      taskId: 't1',
      actorId: 'u1',
      action: 'TASK_STATUS_CHANGED',
      metadata: { from: 'TODO', to: 'IN_PROGRESS' },
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 't1', action: 'TASK_STATUS_CHANGED' }),
      { transaction: tx },
    );
  });

  it('NFR-REL-001: a failing insert rejects so the surrounding transaction rolls back', async () => {
    create.mockImplementation(async () => {
      throw new Error('insert failed');
    });
    await expect(
      new ActivityService().record({} as never, {
        taskId: 't1',
        actorId: 'u1',
        action: 'TASK_ARCHIVED',
        metadata: {},
      }),
    ).rejects.toThrow('insert failed');
  });
});
