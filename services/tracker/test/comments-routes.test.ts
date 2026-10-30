import { AppError } from '@app/shared';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { ActivityService } from '../src/services/activity-service.js';
import type { CommentService } from '../src/services/comment-service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const TASK = '00000000-0000-4000-8000-0000000000bb';
const COMMENT = '00000000-0000-4000-8000-0000000000cc';
const IDENTITY = { 'x-internal-token': 'internal', 'x-user-id': USER, 'x-user-role': 'USER' };
const PAGE = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

function build(
  comments: Record<string, unknown> = {},
  activity: Record<string, unknown> = {},
): ReturnType<typeof createApp> {
  return createApp({
    checkDatabase: async () => true,
    config: { internalToken: 'internal' },
    logger: pino({ level: 'silent' }),
    commentService: {
      add: vi.fn().mockResolvedValue({ id: COMMENT }),
      list: vi.fn().mockResolvedValue(PAGE),
      edit: vi.fn().mockResolvedValue({ id: COMMENT }),
      remove: vi.fn().mockResolvedValue(undefined),
      ...comments,
    } as unknown as CommentService,
    activityService: {
      listForTask: vi.fn().mockResolvedValue(PAGE),
      record: vi.fn(),
      ...activity,
    } as unknown as ActivityService,
  });
}

describe('comments routes', () => {
  it('FR-CMT-001: POST returns 201 and an empty body returns 400', async () => {
    const url = `/tasks/${TASK}/comments`;
    const ok = await request(build()).post(url).set(IDENTITY).send({ body: 'Looks good' });
    expect(ok.status).toBe(201);
    const bad = await request(build()).post(url).set(IDENTITY).send({ body: '' });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-CMT-002: editing someone else comment returns 403 FORBIDDEN', async () => {
    const edit = vi.fn().mockRejectedValue(new AppError('FORBIDDEN', 403, 'no'));
    const response = await request(build({ edit }))
      .patch(`/comments/${COMMENT}`)
      .set(IDENTITY)
      .send({ body: 'x' });
    expect(response.status).toBe(403);
  });

  it('FR-CMT-003: DELETE returns 204 and a non-member gets 404', async () => {
    expect((await request(build()).delete(`/comments/${COMMENT}`).set(IDENTITY)).status).toBe(204);
    const remove = vi.fn().mockRejectedValue(new AppError('NOT_FOUND', 404, 'nope'));
    const response = await request(build({ remove })).delete(`/comments/${COMMENT}`).set(IDENTITY);
    expect(response.status).toBe(404);
  });

  it('FR-CMT-004: GET lists comments with pagination meta', async () => {
    const response = await request(build()).get(`/tasks/${TASK}/comments`).set(IDENTITY);
    expect(response.status).toBe(200);
    expect(response.body.meta.totalPages).toBe(0);
  });
});

describe('activity routes', () => {
  it('FR-ACT-002: GET returns the history page', async () => {
    const response = await request(build()).get(`/tasks/${TASK}/activity`).set(IDENTITY);
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('FR-ACT-001: activity has no update or delete routes', async () => {
    const app = build();
    const url = `/tasks/${TASK}/activity`;
    expect((await request(app).patch(url).set(IDENTITY).send({})).status).toBe(404);
    expect((await request(app).delete(url).set(IDENTITY)).status).toBe(404);
    expect((await request(app).post(url).set(IDENTITY).send({})).status).toBe(404);
  });
});
