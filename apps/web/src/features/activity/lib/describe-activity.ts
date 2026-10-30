import { type Activity } from '@app/shared';

const ACTION_LABELS: Record<Activity['action'], string> = {
  TASK_CREATED: 'created the task',
  TASK_UPDATED: 'updated the task',
  TASK_ASSIGNED: 'changed the assignee',
  TASK_STATUS_CHANGED: 'changed the status',
  TASK_ARCHIVED: 'archived the task',
};

export function actionLabel(action: Activity['action']): string {
  return ACTION_LABELS[action];
}

function value(input: unknown): string {
  return input === null || input === undefined || input === '' ? 'none' : String(input);
}

function describeChanges(metadata: Record<string, unknown>): string {
  const changes = metadata.changes;
  if (typeof changes !== 'object' || changes === null) {
    return '';
  }
  return Object.entries(changes)
    .map(([field, change]) => {
      const { from, to } = change as { from?: unknown; to?: unknown };
      return `${field}: ${value(from)} → ${value(to)}`;
    })
    .join(', ');
}

// FR-UI-009: a readable summary of the change details of one entry.
export function describeActivity(entry: Activity): string {
  const { metadata } = entry;
  switch (entry.action) {
    case 'TASK_STATUS_CHANGED':
      return `${value(metadata.from)} → ${value(metadata.to)}`;
    case 'TASK_ASSIGNED':
      return `assignee: ${value(metadata.from)} → ${value(metadata.to)}`;
    case 'TASK_UPDATED':
      return describeChanges(metadata);
    case 'TASK_CREATED':
      return `${value(metadata.title)} (${value(metadata.status)}, ${value(metadata.priority)})`;
    default:
      return '';
  }
}
