import { Activity, Task } from '@app/database';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { TaskService } from '../src/services/task-service.js';
import {
  asUser,
  buildRealApp,
  closeConnection,
  INTERNAL_TOKEN,
  resetDatabase,
  seedWorld,
  type World,
} from './support/db.js';

describe('regression: conflicts and consistency against real constraints', () => {
  const app = buildRealApp();
  let world: World;

  beforeEach(async () => {
    await resetDatabase();
    world = await seedWorld();
  });

  afterAll(async () => {
    await resetDatabase();
    await closeConnection();
  });

  it('FR-PROJ-006: removing the last Owner is 409 LAST_OWNER', async () => {
    const response = await request(app)
      .delete(`/projects/${world.projectId}/members/${world.owner.id}`)
      .set(asUser(world.owner.id));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LAST_OWNER');
  });

  it('FR-PROJ-005: adding an existing member is 409 ALREADY_MEMBER', async () => {
    const response = await request(app)
      .post(`/projects/${world.projectId}/members`)
      .set(asUser(world.owner.id))
      .send({ email: world.member.email });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('FR-PROJ-005: adding an unknown email is 404 USER_NOT_FOUND', async () => {
    const response = await request(app)
      .post(`/projects/${world.projectId}/members`)
      .set(asUser(world.owner.id))
      .send({ email: 'nobody@example.com' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('FR-TASK-005: TODO to DONE is 409 INVALID_STATUS_TRANSITION and changes nothing', async () => {
    const response = await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.member.id))
      .send({ status: 'DONE' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    expect((await Task.findByPk(world.taskId))?.status).toBe('TODO');
    expect(await Activity.count()).toBe(0);
  });

  it('FR-TASK-004: assigning a non-member is 400 ASSIGNEE_NOT_MEMBER', async () => {
    const response = await request(app)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(asUser(world.owner.id))
      .send({ assigneeId: world.outsider.id });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
  });

  it('FR-PROJ-004: writing to an archived project is 409 PROJECT_ARCHIVED', async () => {
    await request(app).post(`/projects/${world.projectId}/archive`).set(asUser(world.owner.id));
    const response = await request(app)
      .post(`/projects/${world.projectId}/tasks`)
      .set(asUser(world.owner.id))
      .send({ title: 'Too late' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_ARCHIVED');
  });

  it('FR-TASK-006: writing to an archived task is 409 TASK_ARCHIVED', async () => {
    await request(app).post(`/tasks/${world.taskId}/archive`).set(asUser(world.owner.id));
    const response = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.owner.id))
      .send({ title: 'Too late' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TASK_ARCHIVED');
  });

  it('FR-ACT-001: create, assign and DONE leave one entry each, listed newest first', async () => {
    const owner = asUser(world.owner.id);
    const created = await request(app)
      .post(`/projects/${world.projectId}/tasks`)
      .set(owner)
      .send({ title: 'Journey' });
    const taskId = created.body.id as string;
    await request(app)
      .patch(`/tasks/${taskId}/assignee`)
      .set(owner)
      .send({ assigneeId: world.member.id });
    for (const status of ['IN_PROGRESS', 'IN_REVIEW', 'DONE']) {
      await request(app).patch(`/tasks/${taskId}/status`).set(owner).send({ status });
    }
    const activity = await request(app).get(`/tasks/${taskId}/activity`).set(owner);
    expect(activity.status).toBe(200);
    const actions = (activity.body.items as { action: string }[]).map((item) => item.action);
    expect(actions).toEqual([
      'TASK_STATUS_CHANGED',
      'TASK_STATUS_CHANGED',
      'TASK_STATUS_CHANGED',
      'TASK_ASSIGNED',
      'TASK_CREATED',
    ]);
  });

  it('NFR-REL-001: a failing activity write rolls the status change back', async () => {
    const failing = createApp({
      checkDatabase: async () => true,
      config: { internalToken: INTERNAL_TOKEN },
      logger: pino({ level: 'silent' }),
      taskService: new TaskService({
        record: async () => {
          throw new Error('activity insert failed');
        },
      }),
    });
    const response = await request(failing)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.owner.id))
      .send({ status: 'IN_PROGRESS' });
    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect((await Task.findByPk(world.taskId))?.status).toBe('TODO');
    expect(await Activity.count()).toBe(0);
  });
});
