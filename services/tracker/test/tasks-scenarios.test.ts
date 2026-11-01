import { Activity, Project, Task } from '@app/database';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { TaskService } from '../src/services/task-service.js';
import {
  INTERNAL_TOKEN,
  asUser,
  buildRealApp,
  closeConnection,
  resetDatabase,
  seedWorld,
  type World,
} from './support/db.js';

type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
const ALLOWED: Record<Status, Status[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['TODO', 'IN_REVIEW'],
  IN_REVIEW: ['IN_PROGRESS', 'DONE'],
  DONE: ['IN_PROGRESS'],
};
const STATUSES: Status[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000ff';

function isoDay(offsetDays: number): string {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + offsetDays);
  return day.toISOString().slice(0, 10);
}

// Spec scenarios of capability `tasks` (dev-11-tasks) that need real rows.
describe('tasks scenarios against the database', () => {
  const app = buildRealApp();
  let world: World;

  const createUrl = (): string => `/projects/${world.projectId}/tasks`;
  const taskCount = (): Promise<number> => Task.count({ where: { projectId: world.projectId } });
  const actionsOf = async (taskId: string): Promise<string[]> =>
    (await Activity.findAll({ where: { taskId }, order: [['createdAt', 'ASC']] })).map(
      (row) => row.action,
    );

  beforeEach(async () => {
    await resetDatabase();
    world = await seedWorld();
  });

  afterAll(async () => {
    await resetDatabase();
    await closeConnection();
  });

  it('FR-TASK-001: Valid task', async () => {
    const response = await request(app)
      .post(createUrl())
      .set(asUser(world.member.id))
      .send({
        title: 'Write docs',
        description: 'about it',
        priority: 'HIGH',
        dueDate: isoDay(1),
        assigneeId: world.owner.id,
      });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Write docs',
      status: 'TODO',
      priority: 'HIGH',
      dueDate: isoDay(1),
      projectId: world.projectId,
      assignee: { id: world.owner.id },
      createdBy: { id: world.member.id },
      archivedAt: null,
    });
    const row = await Task.findByPk(response.body.id);
    expect(row?.status).toBe('TODO');
    expect(row?.createdById).toBe(world.member.id);
    expect(row?.assigneeId).toBe(world.owner.id);
    expect(await actionsOf(response.body.id)).toEqual(['TASK_CREATED']);

    // Defaults: priority MEDIUM, no description, no due date, no assignee.
    const minimal = await request(app)
      .post(createUrl())
      .set(asUser(world.member.id))
      .send({ title: 'Minimal' });
    expect(minimal.status).toBe(201);
    expect(minimal.body).toMatchObject({
      priority: 'MEDIUM',
      status: 'TODO',
      description: null,
      dueDate: null,
      assignee: null,
    });

    // Boundaries: title 200, description 5000 and a due date of today are accepted.
    const edge = await request(app)
      .post(createUrl())
      .set(asUser(world.member.id))
      .send({ title: 't'.repeat(200), description: 'd'.repeat(5000), dueDate: isoDay(0) });
    expect(edge.status).toBe(201);
    expect(edge.body.title).toHaveLength(200);
    expect(edge.body.description).toHaveLength(5000);
    expect(await taskCount()).toBe(4);

    // Boundaries: title 201, blank title, description 5001 and an unknown priority are rejected.
    for (const body of [
      { title: 't'.repeat(201) },
      { title: '   ' },
      { title: 'ok', description: 'd'.repeat(5001) },
      { title: 'ok', priority: 'CRITICAL' },
    ]) {
      const rejected = await request(app).post(createUrl()).set(asUser(world.member.id)).send(body);
      expect(rejected.status).toBe(400);
      expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(await taskCount()).toBe(4);
  });

  it('FR-TASK-001: Assignee not a member', async () => {
    for (const assigneeId of [world.outsider.id, UNKNOWN_ID]) {
      const response = await request(app)
        .post(createUrl())
        .set(asUser(world.owner.id))
        .send({ title: 'Nope', assigneeId });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
    }
    expect(await taskCount()).toBe(1);
    expect(await Activity.count()).toBe(0);
  });

  it('FR-TASK-001: Past due date', async () => {
    const response = await request(app)
      .post(createUrl())
      .set(asUser(world.owner.id))
      .send({ title: 'Late', dueDate: isoDay(-1) });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].path).toBe('dueDate');
    expect(await taskCount()).toBe(1);

    const today = await request(app)
      .post(createUrl())
      .set(asUser(world.owner.id))
      .send({ title: 'Today', dueDate: isoDay(0) });
    expect(today.status).toBe(201);

    const malformed = await request(app)
      .post(createUrl())
      .set(asUser(world.owner.id))
      .send({ title: 'Bad date', dueDate: 'tomorrow' });
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-TASK-001: Non-member creates', async () => {
    const response = await request(app)
      .post(createUrl())
      .set(asUser(world.outsider.id))
      .send({ title: 'Sneaky' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(await taskCount()).toBe(1);

    const missing = await request(app)
      .post(`/projects/${UNKNOWN_ID}/tasks`)
      .set(asUser(world.owner.id))
      .send({ title: 'Nowhere' });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-TASK-001: Archived project', async () => {
    await Project.update({ status: 'ARCHIVED' }, { where: { id: world.projectId } });
    const response = await request(app)
      .post(createUrl())
      .set(asUser(world.owner.id))
      .send({ title: 'Too late' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_ARCHIVED');
    expect(await taskCount()).toBe(1);

    const status = await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.owner.id))
      .send({ status: 'IN_PROGRESS' });
    expect(status.status).toBe(409);
    expect(status.body.error.code).toBe('PROJECT_ARCHIVED');
  });

  it('FR-TASK-002: Member views', async () => {
    await Task.update(
      { assigneeId: world.member.id, description: 'details', priority: 'URGENT' },
      { where: { id: world.taskId } },
    );
    for (const viewer of [world.owner, world.member]) {
      const response = await request(app).get(`/tasks/${world.taskId}`).set(asUser(viewer.id));
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: world.taskId,
        title: 'First task',
        description: 'details',
        priority: 'URGENT',
        status: 'TODO',
        assignee: { id: world.member.id, name: 'Member' },
        createdBy: { id: world.owner.id, name: 'Owner' },
        archivedAt: null,
      });
      expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
      expect(Number.isNaN(Date.parse(response.body.updatedAt))).toBe(false);
    }
    await Task.update({ assigneeId: null }, { where: { id: world.taskId } });
    const unassigned = await request(app).get(`/tasks/${world.taskId}`).set(asUser(world.owner.id));
    expect(unassigned.body.assignee).toBeNull();
  });

  it('FR-TASK-002: Missing or foreign task', async () => {
    const missing = await request(app).get(`/tasks/${UNKNOWN_ID}`).set(asUser(world.owner.id));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');

    const foreign = await request(app).get(`/tasks/${world.taskId}`).set(asUser(world.outsider.id));
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe('NOT_FOUND');
    expect(foreign.body).toEqual(missing.body);

    const malformed = await request(app).get('/tasks/not-a-uuid').set(asUser(world.owner.id));
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('VALIDATION_ERROR');

    const anonymous = await request(app).get(`/tasks/${world.taskId}`);
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('UNAUTHORIZED');
  });

  it('FR-TASK-003: Valid update', async () => {
    const before = await Task.findByPk(world.taskId);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const response = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.member.id))
      .send({ title: 'Renamed', description: 'new text', priority: 'LOW', dueDate: isoDay(5) });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: 'Renamed',
      description: 'new text',
      priority: 'LOW',
      dueDate: isoDay(5),
    });
    expect(response.body.updatedAt).not.toBe(before?.updatedAt.toISOString());
    const row = await Task.findByPk(world.taskId);
    expect(row?.title).toBe('Renamed');
    expect(row?.priority).toBe('LOW');
    expect(row?.dueDate).toBe(isoDay(5));
    expect(row?.updatedAt.getTime()).toBeGreaterThan(before?.updatedAt.getTime() ?? 0);
    expect(await actionsOf(world.taskId)).toEqual(['TASK_UPDATED']);

    // Clearing the optional fields with null is allowed.
    const cleared = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.member.id))
      .send({ description: null, dueDate: null });
    expect(cleared.status).toBe(200);
    expect(cleared.body.description).toBeNull();
    expect(cleared.body.dueDate).toBeNull();

    // Boundaries: title 200 accepted; title 201, blank, description 5001 and an empty body rejected.
    const edge = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.member.id))
      .send({ title: 't'.repeat(200), description: 'd'.repeat(5000) });
    expect(edge.status).toBe(200);
    for (const body of [
      { title: 't'.repeat(201) },
      { title: '  ' },
      { description: 'd'.repeat(5001) },
      {},
    ]) {
      const rejected = await request(app)
        .patch(`/tasks/${world.taskId}`)
        .set(asUser(world.member.id))
        .send(body);
      expect(rejected.status).toBe(400);
      expect(rejected.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect((await Task.findByPk(world.taskId))?.title).toHaveLength(200);

    const outsider = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.outsider.id))
      .send({ title: 'Hijack' });
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-TASK-003: Archived task', async () => {
    await Task.update({ archivedAt: new Date() }, { where: { id: world.taskId } });
    const response = await request(app)
      .patch(`/tasks/${world.taskId}`)
      .set(asUser(world.owner.id))
      .send({ title: 'Changed' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('TASK_ARCHIVED');
    expect((await Task.findByPk(world.taskId))?.title).toBe('First task');
    expect(await Activity.count()).toBe(0);
  });

  it('FR-TASK-004: Assign member', async () => {
    const response = await request(app)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(asUser(world.member.id))
      .send({ assigneeId: world.spare.id });
    expect(response.status).toBe(200);
    expect(response.body.assignee).toMatchObject({ id: world.spare.id, name: 'Spare' });
    expect((await Task.findByPk(world.taskId))?.assigneeId).toBe(world.spare.id);
    const entries = await Activity.findAll({ where: { taskId: world.taskId } });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('TASK_ASSIGNED');
    expect(entries[0]?.actorId).toBe(world.member.id);
    expect(entries[0]?.metadata).toEqual({ from: null, to: world.spare.id });

    // Unassign with null.
    const unassigned = await request(app)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(asUser(world.member.id))
      .send({ assigneeId: null });
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.assignee).toBeNull();
    expect((await Task.findByPk(world.taskId))?.assigneeId).toBeNull();
    expect(await actionsOf(world.taskId)).toEqual(['TASK_ASSIGNED', 'TASK_ASSIGNED']);

    // Same transaction: when the activity write fails the assignee does not change.
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
    const rolledBack = await request(failing)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(asUser(world.member.id))
      .send({ assigneeId: world.owner.id });
    expect(rolledBack.status).toBe(500);
    expect((await Task.findByPk(world.taskId))?.assigneeId).toBeNull();
    expect(await Activity.count()).toBe(2);
  });

  it('FR-TASK-004: Assign non-member', async () => {
    for (const assigneeId of [world.outsider.id, UNKNOWN_ID]) {
      const response = await request(app)
        .patch(`/tasks/${world.taskId}/assignee`)
        .set(asUser(world.owner.id))
        .send({ assigneeId });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
    }
    expect((await Task.findByPk(world.taskId))?.assigneeId).toBeNull();
    expect(await Activity.count()).toBe(0);

    const caller = await request(app)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(asUser(world.outsider.id))
      .send({ assigneeId: world.owner.id });
    expect(caller.status).toBe(404);
    expect(caller.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-TASK-005: Allowed transition', async () => {
    // Walks all six allowed edges: TODO>IP, IP>TODO, IP>IR, IR>IP, IR>DONE, DONE>IP.
    const walk: Status[] = [
      'IN_PROGRESS',
      'TODO',
      'IN_PROGRESS',
      'IN_REVIEW',
      'IN_PROGRESS',
      'IN_REVIEW',
      'DONE',
      'IN_PROGRESS',
    ];
    let from: Status = 'TODO';
    for (const to of walk) {
      const response = await request(app)
        .patch(`/tasks/${world.taskId}/status`)
        .set(asUser(world.member.id))
        .send({ status: to });
      expect(response.status).toBe(200);
      expect(response.body.status).toBe(to);
      expect((await Task.findByPk(world.taskId))?.status).toBe(to);
      const latest = await Activity.findOne({
        where: { taskId: world.taskId },
        order: [['createdAt', 'DESC']],
      });
      expect(latest?.action).toBe('TASK_STATUS_CHANGED');
      expect(latest?.actorId).toBe(world.member.id);
      expect(latest?.metadata).toEqual({ from, to });
      from = to;
    }
    expect(await Activity.count({ where: { taskId: world.taskId } })).toBe(walk.length);
  });

  it('FR-TASK-005: Disallowed transition', async () => {
    let checked = 0;
    for (const from of STATUSES) {
      await Task.update({ status: from }, { where: { id: world.taskId } });
      for (const to of STATUSES.filter((status) => !ALLOWED[from].includes(status))) {
        const response = await request(app)
          .patch(`/tasks/${world.taskId}/status`)
          .set(asUser(world.owner.id))
          .send({ status: to });
        expect(response.status).toBe(409);
        expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
        expect(response.body.error.details[0].message).toBe(`Allowed: ${ALLOWED[from].join(', ')}`);
        expect((await Task.findByPk(world.taskId))?.status).toBe(from);
        checked += 1;
      }
    }
    expect(checked).toBe(10);
    expect(await Activity.count()).toBe(0);

    await Task.update({ status: 'TODO' }, { where: { id: world.taskId } });
    const unknown = await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.owner.id))
      .send({ status: 'BLOCKED' });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-TASK-006: Archive', async () => {
    const response = await request(app)
      .post(`/tasks/${world.taskId}/archive`)
      .set(asUser(world.member.id));
    expect(response.status).toBe(200);
    expect(response.body.archivedAt).not.toBeNull();
    const row = await Task.findByPk(world.taskId);
    expect(row?.archivedAt).not.toBeNull();
    const entries = await Activity.findAll({ where: { taskId: world.taskId } });
    expect(entries.map((entry) => entry.action)).toEqual(['TASK_ARCHIVED']);
    expect(entries[0]?.actorId).toBe(world.member.id);

    // Hidden from the default list, shown with includeArchived.
    const hidden = await request(app).get(createUrl()).set(asUser(world.owner.id));
    expect(hidden.status).toBe(200);
    expect(hidden.body.items).toHaveLength(0);
    const shown = await request(app)
      .get(`${createUrl()}?includeArchived=true`)
      .set(asUser(world.owner.id));
    expect(shown.body.items).toHaveLength(1);

    // Archiving twice is a conflict and adds no second entry.
    const again = await request(app)
      .post(`/tasks/${world.taskId}/archive`)
      .set(asUser(world.owner.id));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TASK_ARCHIVED');
    expect(await Activity.count()).toBe(1);
  });

  it('FR-TASK-006: Modify archived', async () => {
    await Task.update({ archivedAt: new Date() }, { where: { id: world.taskId } });
    const owner = asUser(world.owner.id);
    const attempts = [
      request(app).patch(`/tasks/${world.taskId}`).set(owner).send({ title: 'Changed' }),
      request(app).patch(`/tasks/${world.taskId}/assignee`).set(owner).send({ assigneeId: null }),
      request(app)
        .patch(`/tasks/${world.taskId}/status`)
        .set(owner)
        .send({ status: 'IN_PROGRESS' }),
    ];
    for (const attempt of attempts) {
      const response = await attempt;
      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('TASK_ARCHIVED');
    }
    const row = await Task.findByPk(world.taskId);
    expect(row?.title).toBe('First task');
    expect(row?.status).toBe('TODO');
    expect(await Activity.count()).toBe(0);
  });

  it('FR-TASK-006: Non-member archives', async () => {
    const response = await request(app)
      .post(`/tasks/${world.taskId}/archive`)
      .set(asUser(world.outsider.id));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect((await Task.findByPk(world.taskId))?.archivedAt).toBeNull();
    expect(await Activity.count()).toBe(0);

    const missing = await request(app)
      .post(`/tasks/${UNKNOWN_ID}/archive`)
      .set(asUser(world.owner.id));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  // mutate() locks the task row, so two concurrent identical transitions yield one winner (409 for the other).
  it('FR-TASK-005: concurrent identical transitions yield one winner', async () => {
    const slow = createApp({
      checkDatabase: async () => true,
      config: { internalToken: INTERNAL_TOKEN },
      logger: pino({ level: 'silent' }),
      taskService: new TaskService({
        record: async (tx, event) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          await Activity.create({ ...event }, { transaction: tx });
        },
      }),
    });
    const results = await Promise.all(
      [1, 2].map(() =>
        request(slow)
          .patch(`/tasks/${world.taskId}/status`)
          .set(asUser(world.owner.id))
          .send({ status: 'IN_PROGRESS' }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(await Activity.count({ where: { taskId: world.taskId } })).toBe(1);
  });
});
