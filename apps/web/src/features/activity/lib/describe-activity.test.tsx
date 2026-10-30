import { type Activity } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { actionLabel, describeActivity } from './describe-activity.ts';

function entry(action: Activity['action'], metadata: Record<string, unknown>): Activity {
  return {
    id: '00000000-0000-4000-8000-0000000000dd',
    taskId: '00000000-0000-4000-8000-0000000000bb',
    actor: { id: '00000000-0000-4000-8000-000000000001', name: 'Ada' },
    action,
    metadata,
    createdAt: '2030-01-01T00:00:00.000Z',
  };
}

describe('describeActivity', () => {
  it('FR-UI-009: shows the old and new status', () => {
    const status = entry('TASK_STATUS_CHANGED', { from: 'TODO', to: 'IN_PROGRESS' });
    expect(describeActivity(status)).toBe('TODO → IN_PROGRESS');
    expect(actionLabel('TASK_STATUS_CHANGED')).toBe('changed the status');
  });

  it('FR-UI-009: lists every changed field of an update', () => {
    const update = entry('TASK_UPDATED', {
      changes: { title: { from: 'A', to: 'B' }, dueDate: { from: null, to: '2030-02-01' } },
    });
    expect(describeActivity(update)).toBe('title: A → B, dueDate: none → 2030-02-01');
  });

  it('FR-UI-009: an archive entry has no extra details', () => {
    expect(describeActivity(entry('TASK_ARCHIVED', {}))).toBe('');
  });
});
