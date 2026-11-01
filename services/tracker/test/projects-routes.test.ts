import { AppError } from '@app/shared';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { ProjectService } from '../src/services/project-service.js';

const USER = '00000000-0000-4000-8000-000000000001';
const PROJECT = '00000000-0000-4000-8000-0000000000aa';
const IDENTITY = { 'x-internal-token': 'internal', 'x-user-id': USER, 'x-user-role': 'USER' };
const DETAIL = { id: PROJECT, name: 'Alpha', members: [], myRole: 'OWNER' };

function build(service: Record<string, unknown> = {}): ReturnType<typeof createApp> {
  return createApp({
    checkDatabase: async () => true,
    config: { internalToken: 'internal' },
    logger: pino({ level: 'silent' }),
    projectService: {
      create: vi.fn().mockResolvedValue(DETAIL),
      list: vi.fn().mockResolvedValue({ items: [] }),
      get: vi.fn().mockResolvedValue(DETAIL),
      update: vi.fn().mockResolvedValue(DETAIL),
      archive: vi.fn().mockResolvedValue(DETAIL),
      addMember: vi.fn().mockResolvedValue({ userId: USER }),
      removeMember: vi.fn().mockResolvedValue(undefined),
      ...service,
    } as unknown as ProjectService,
  });
}

describe('projects routes', () => {
  it('FR-PROJ-001: status mapping of Valid project', async () => {
    const response = await request(build()).post('/projects').set(IDENTITY).send({ name: 'Alpha' });
    expect(response.status).toBe(201);
  });

  it('FR-PROJ-001: Invalid name', async () => {
    const response = await request(build()).post('/projects').set(IDENTITY).send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    const tooLong = await request(build())
      .post('/projects')
      .set(IDENTITY)
      .send({ name: 'x'.repeat(101) });
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.error.code).toBe('VALIDATION_ERROR');
    const empty = await request(build()).post('/projects').set(IDENTITY).send({ name: '' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');
    const longDescription = await request(build())
      .post('/projects')
      .set(IDENTITY)
      .send({ name: 'Alpha', description: 'd'.repeat(1001) });
    expect(longDescription.status).toBe(400);
    expect(longDescription.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-PROJ-002: Non-member views project', async () => {
    const get = vi.fn().mockRejectedValue(new AppError('NOT_FOUND', 404, 'Project not found'));
    const response = await request(build({ get })).get(`/projects/${PROJECT}`).set(IDENTITY);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-PROJ-002: GET /projects/:id with a malformed id returns 400', async () => {
    const response = await request(build()).get('/projects/nope').set(IDENTITY);
    expect(response.status).toBe(400);
  });

  it('FR-AUTH-006: Member updates', async () => {
    const update = vi.fn().mockRejectedValue(new AppError('FORBIDDEN', 403, 'no'));
    const response = await request(build({ update }))
      .patch(`/projects/${PROJECT}`)
      .set(IDENTITY)
      .send({ name: 'B' });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('FR-PROJ-005: status mapping of Add user', async () => {
    const response = await request(build())
      .post(`/projects/${PROJECT}/members`)
      .set(IDENTITY)
      .send({ email: 'bob@example.com' });
    expect(response.status).toBe(201);
  });

  it('FR-PROJ-005: Already member', async () => {
    const addMember = vi.fn().mockRejectedValue(new AppError('ALREADY_MEMBER', 409, 'dup'));
    const dup = await request(build({ addMember }))
      .post(`/projects/${PROJECT}/members`)
      .set(IDENTITY)
      .send({ email: 'bob@example.com' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('FR-PROJ-006: status mapping of Remove member', async () => {
    const url = `/projects/${PROJECT}/members/${USER}`;
    expect((await request(build()).delete(url).set(IDENTITY)).status).toBe(204);
  });

  it('FR-PROJ-006: status mapping of Last owner', async () => {
    const url = `/projects/${PROJECT}/members/${USER}`;
    const removeMember = vi.fn().mockRejectedValue(new AppError('LAST_OWNER', 409, 'last'));
    const last = await request(build({ removeMember })).delete(url).set(IDENTITY);
    expect(last.status).toBe(409);
    expect(last.body.error.code).toBe('LAST_OWNER');
  });
});
