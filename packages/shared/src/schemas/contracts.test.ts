import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  CreateCommentSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  LoginSchema,
  RegisterSchema,
  TaskListQuerySchema,
  isAllowedTransition,
} from '../index.js';

describe('auth contracts', () => {
  it('FR-AUTH-001: accepts a valid registration', () => {
    const result = RegisterSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'abcdefg1',
    });
    expect(result.success).toBe(true);
  });

  it('FR-AUTH-001: rejects a password without a number', () => {
    const result = RegisterSchema.safeParse({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'abcdefgh',
    });
    expect(result.success).toBe(false);
  });

  it('FR-AUTH-002: rejects a login without a password', () => {
    expect(LoginSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(false);
  });
});

describe('domain contracts', () => {
  it('FR-PROJ-001: rejects a project name longer than 100 characters', () => {
    expect(CreateProjectSchema.safeParse({ name: 'x'.repeat(101) }).success).toBe(false);
  });

  it('FR-TASK-001: defaults priority to MEDIUM', () => {
    const result = CreateTaskSchema.parse({ title: 'Write docs' });
    expect(result.priority).toBe('MEDIUM');
  });

  it('FR-TASK-005: TODO cannot go straight to DONE', () => {
    expect(isAllowedTransition('TODO', 'DONE')).toBe(false);
    expect(ALLOWED_TRANSITIONS.IN_REVIEW).toEqual(['IN_PROGRESS', 'DONE']);
  });

  it('FR-FILT-001: parses comma separated filters', () => {
    const result = TaskListQuerySchema.parse({ status: 'TODO,IN_PROGRESS', priority: 'HIGH' });
    expect(result.status).toEqual(['TODO', 'IN_PROGRESS']);
    expect(result.sort).toBe('createdAt');
  });

  it('FR-FILT-001: rejects unknown query parameters', () => {
    expect(TaskListQuerySchema.safeParse({ bogus: '1' }).success).toBe(false);
  });

  it('FR-FILT-003: rejects pageSize above 100', () => {
    expect(TaskListQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });

  it('FR-CMT-001: rejects an empty comment', () => {
    expect(CreateCommentSchema.safeParse({ body: '  ' }).success).toBe(false);
  });
});
