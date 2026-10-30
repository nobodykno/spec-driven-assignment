import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodeSchema, ErrorResponseSchema, HealthResponseSchema } from '../index.js';

// SDS §6.4
const SDS_ERROR_CODES = [
  'VALIDATION_ERROR',
  'ASSIGNEE_NOT_MEMBER',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'FORBIDDEN',
  'NOT_FOUND',
  'USER_NOT_FOUND',
  'EMAIL_TAKEN',
  'ALREADY_MEMBER',
  'LAST_OWNER',
  'PROJECT_ARCHIVED',
  'TASK_ARCHIVED',
  'INVALID_STATUS_TRANSITION',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;

describe('HealthResponseSchema', () => {
  it.each(['ok', 'error'])('FR-SYS-001: accepts status %s', (status) => {
    expect(HealthResponseSchema.safeParse({ status }).success).toBe(true);
  });

  it.each([{ status: 'unknown' }, {}, 'ok', null])('FR-SYS-001: rejects %j', (value) => {
    expect(HealthResponseSchema.safeParse(value).success).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('NFR-MNT-001: ErrorCodeSchema contains exactly the SDS §6.4 codes', () => {
    expect([...ErrorCodeSchema.options].sort()).toEqual([...SDS_ERROR_CODES].sort());
  });

  it.each(SDS_ERROR_CODES)('NFR-MNT-001: accepts error code %s', (code) => {
    expect(ErrorResponseSchema.safeParse({ error: { code, message: 'm' } }).success).toBe(true);
  });

  it('NFR-MNT-001: accepts field details', () => {
    const body = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ path: 'title', message: 'Required' }],
      },
    };
    expect(ErrorResponseSchema.safeParse(body).success).toBe(true);
  });

  it('NFR-MNT-001: rejects an unknown error code', () => {
    const body = { error: { code: 'SOMETHING_ELSE', message: 'm' } };
    expect(ErrorResponseSchema.safeParse(body).success).toBe(false);
  });

  it('NFR-MNT-001: rejects a body without a message', () => {
    expect(ErrorResponseSchema.safeParse({ error: { code: 'NOT_FOUND' } }).success).toBe(false);
  });
});

describe('AppError', () => {
  it('NFR-MNT-001: keeps code, status, message and details', () => {
    const details = [{ path: 'email', message: 'Invalid email' }];
    const error = new AppError('VALIDATION_ERROR', 400, 'Invalid input', details);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.status).toBe(400);
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual(details);
  });

  it('NFR-MNT-001: serialises to the shared error body', () => {
    const error = new AppError('NOT_FOUND', 404, 'Not found');
    const body = error.toResponse();
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
    expect(ErrorResponseSchema.safeParse(body).success).toBe(true);
  });
});
