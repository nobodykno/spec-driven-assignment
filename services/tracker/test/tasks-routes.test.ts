import { AppError } from '@app/shared';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { TaskService } from '../src/services/task-service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const PROJECT = '00000000-0000-4000-8000-0000000000aa';
const TASK = '00000000-0000-4000-8000-0000000000bb';
const IDENTITY = { 'x-internal-token': 'internal', 'x-user-id': USER, 'x-user-role': 'USER' };

function build(service: Record<string, unknown> = {}): ReturnType<typeof createApp> {
  return createApp({
    checkDatabase: async () => true,
    config: { internalToken: 'internal' },
    logger: pino({ level: 'silent' }),
    taskService: {
      create: vi.fn().mockResolvedValue({ id: TASK }),
      get: vi.fn().mockResolvedValue({ id: TASK }),
      update: vi.fn().mockResolvedValue({ id: TASK }),
      assign: vi.fn().mockResolvedValue({ id: TASK }),
      changeStatus: vi.fn().mockResolvedValue({ id: TASK }),
      archive: vi.fn().mockResolvedValue({ id: TASK }),
      ...service,
    } as unknown as TaskService,
  });
}

describe('tasks routes', () => {
  it('FR-TASK-001: POST /projects/:id/tasks returns 201', async () => {
    const response = await request(build())
      .post(`/projects/${PROJECT}/tasks`)
      .set(IDENTITY)
      .send({ title: 'Write docs' });
    expect(response.status).toBe(201);
  });

  it('FR-TASK-001: an empty title returns 400 VALIDATION_ERROR', async () => {
    const response = await request(build())
      .post(`/projects/${PROJECT}/tasks`)
      .set(IDENTITY)
      .send({ title: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-TASK-001: ASSIGNEE_NOT_MEMBER maps to 400', async () => {
    const create = vi.fn().mockRejectedValue(new AppError('ASSIGNEE_NOT_MEMBER', 400, 'no'));
    const response = await request(build({ create }))
      .post(`/projects/${PROJECT}/tasks`)
      .set(IDENTITY)
      .send({ title: 'x', assigneeId: USER });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
  });

  it('FR-TASK-002: GET /tasks/:id for a non-member returns 404 NOT_FOUND', async () => {
    const get = vi.fn().mockRejectedValue(new AppError('NOT_FOUND', 404, 'Task not found'));
    const response = await request(build({ get })).get(`/tasks/${TASK}`).set(IDENTITY);
    expect(response.status).toBe(404);
  });

  it('FR-TASK-003: PATCH on an archived task returns 409 TASK_ARCHIVED', async () => {
    const update = vi.fn().mockRejectedValue(new AppError('TASK_ARCHIVED', 409, 'archived'));
    const response = await request(build({ update }))
      .patch(`/tasks/${TASK}`)
      .set(IDENTITY)
      .send({ title: 'x' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TASK_ARCHIVED');
  });

  it('FR-TASK-004: PATCH assignee accepts null to unassign', async () => {
    const assign = vi.fn().mockResolvedValue({ id: TASK });
    const response = await request(build({ assign }))
      .patch(`/tasks/${TASK}/assignee`)
      .set(IDENTITY)
      .send({ assigneeId: null });
    expect(response.status).toBe(200);
    expect(assign).toHaveBeenCalledWith(USER, TASK, null);
  });

  it('FR-TASK-005: an invalid transition returns 409 INVALID_STATUS_TRANSITION', async () => {
    const changeStatus = vi
      .fn()
      .mockRejectedValue(new AppError('INVALID_STATUS_TRANSITION', 409, 'bad'));
    const response = await request(build({ changeStatus }))
      .patch(`/tasks/${TASK}/status`)
      .set(IDENTITY)
      .send({ status: 'DONE' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('FR-TASK-005: an unknown status value returns 400', async () => {
    const response = await request(build())
      .patch(`/tasks/${TASK}/status`)
      .set(IDENTITY)
      .send({ status: 'BOGUS' });
    expect(response.status).toBe(400);
  });

  it('FR-TASK-006: POST archive returns 200', async () => {
    const response = await request(build()).post(`/tasks/${TASK}/archive`).set(IDENTITY);
    expect(response.status).toBe(200);
  });
});
