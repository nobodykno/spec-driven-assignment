import { AppError } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { assertDueDateNotPast, assertTransition } from './task-rules.js';

const NOW = new Date('2026-10-30T12:00:00Z');

function catchError(fn: () => void): AppError {
  try {
    fn();
  } catch (error) {
    return error as AppError;
  }
  throw new Error('expected an error');
}

describe('assertTransition', () => {
  it('FR-TASK-005: allows IN_PROGRESS to IN_REVIEW', () => {
    expect(() => assertTransition('IN_PROGRESS', 'IN_REVIEW')).not.toThrow();
  });

  it('FR-TASK-005: rejects TODO to DONE listing the allowed targets', () => {
    const error = catchError(() => assertTransition('TODO', 'DONE'));
    expect(error.code).toBe('INVALID_STATUS_TRANSITION');
    expect(error.status).toBe(409);
    expect(error.details).toEqual([{ path: 'status', message: 'Allowed: IN_PROGRESS' }]);
  });
});

describe('assertDueDateNotPast', () => {
  it('FR-TASK-001: accepts today, a future date and no date', () => {
    expect(() => assertDueDateNotPast('2026-10-30', NOW)).not.toThrow();
    expect(() => assertDueDateNotPast('2026-12-01', NOW)).not.toThrow();
    expect(() => assertDueDateNotPast(null, NOW)).not.toThrow();
  });

  it('FR-TASK-001: rejects a past date with a dueDate detail', () => {
    const error = catchError(() => assertDueDateNotPast('2026-10-29', NOW));
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.[0]?.path).toBe('dueDate');
  });
});
