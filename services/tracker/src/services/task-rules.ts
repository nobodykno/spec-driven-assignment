import { AppError, ALLOWED_TRANSITIONS, isAllowedTransition, type TaskStatus } from '@app/shared';

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

// FR-TASK-001 / D5: a due date may not be before today (UTC date compare).
export function assertDueDateNotPast(dueDate: string | null | undefined, now: Date): void {
  if (dueDate && dueDate < todayUtc(now)) {
    throw new AppError('VALIDATION_ERROR', 400, 'Validation failed', [
      { path: 'dueDate', message: 'Due date must not be in the past' },
    ]);
  }
}

// FR-TASK-005 / D3
export function assertTransition(from: TaskStatus, to: TaskStatus): void {
  if (!isAllowedTransition(from, to)) {
    const allowed = ALLOWED_TRANSITIONS[from].join(', ');
    throw new AppError(
      'INVALID_STATUS_TRANSITION',
      409,
      `Cannot change status from ${from} to ${to}`,
      [{ path: 'status', message: `Allowed: ${allowed}` }],
    );
  }
}
