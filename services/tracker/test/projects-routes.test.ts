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
  it('FR-PROJ-001: POST /projects returns 201', async () => {
    const response = await request(build()).post('/projects').set(IDENTITY).send({ name: 'Alpha' });
    expect(response.status).toBe(201);
  });

  it('FR-PROJ-001: POST /projects with a missing name returns 400 VALIDATION_ERROR', async () => {
    const response = await request(build()).post('/projects').set(IDENTITY).send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-PROJ-002: GET /projects/:id for a non-member returns 404 NOT_FOUND', async () => {
    const get = vi.fn().mockRejectedValue(new AppError('NOT_FOUND', 404, 'Project not found'));
    const response = await request(build({ get })).get(`/projects/${PROJECT}`).set(IDENTITY);
    expect(response.status).toBe(404);
  });

  it('FR-PROJ-002: GET /projects/:id with a malformed id returns 400', async () => {
    const response = await request(build()).get('/projects/nope').set(IDENTITY);
    expect(response.status).toBe(400);
  });

  it('FR-PROJ-003: PATCH by a member returns 403 FORBIDDEN', async () => {
    const update = vi.fn().mockRejectedValue(new AppError('FORBIDDEN', 403, 'no'));
    const response = await request(build({ update }))
      .patch(`/projects/${PROJECT}`)
      .set(IDENTITY)
      .send({ name: 'B' });
    expect(response.status).toBe(403);
  });

  it('FR-PROJ-005: POST members returns 201 and 409 ALREADY_MEMBER maps through', async () => {
    const ok = await request(build())
      .post(`/projects/${PROJECT}/members`)
      .set(IDENTITY)
      .send({ email: 'bob@example.com' });
    expect(ok.status).toBe(201);
    const addMember = vi.fn().mockRejectedValue(new AppError('ALREADY_MEMBER', 409, 'dup'));
    const dup = await request(build({ addMember }))
      .post(`/projects/${PROJECT}/members`)
      .set(IDENTITY)
      .send({ email: 'bob@example.com' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('FR-PROJ-006: DELETE member returns 204 and LAST_OWNER returns 409', async () => {
    const url = `/projects/${PROJECT}/members/${USER}`;
    expect((await request(build()).delete(url).set(IDENTITY)).status).toBe(204);
    const removeMember = vi.fn().mockRejectedValue(new AppError('LAST_OWNER', 409, 'last'));
    const last = await request(build({ removeMember })).delete(url).set(IDENTITY);
    expect(last.status).toBe(409);
    expect(last.body.error.code).toBe('LAST_OWNER');
  });
});
