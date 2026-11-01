import { Activity, Comment, Task, getSequelize } from '@app/database';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ActivityService } from '../src/services/activity-service.js';
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

interface ActivityItem {
  actor: { id: string; name: string };
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Spec scenarios of capability `comments-activity` (dev-13-comments-activity) that need real rows.
describe('comments and activity scenarios against the database', () => {
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

  async function listActivity(taskId: string, userId: string): Promise<ActivityItem[]> {
    const response = await request(app).get(`/tasks/${taskId}/activity`).set(asUser(userId));
    expect(response.status).toBe(200);
    return response.body.items as ActivityItem[];
  }

  it('FR-CMT-001: Valid comment', async () => {
    const url = `/tasks/${world.taskId}/comments`;
    const response = await request(app)
      .post(url)
      .set(asUser(world.member.id))
      .send({ body: 'Looks good' });
    expect(response.status).toBe(201);
    expect(response.body.body).toBe('Looks good');
    expect(response.body.author).toEqual({ id: world.member.id, name: 'Member' });
    expect(response.body.taskId).toBe(world.taskId);
    expect(response.body.editedAt).toBeNull();
    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);

    const row = await Comment.findByPk(response.body.id);
    expect(row?.authorId).toBe(world.member.id);
    expect(row?.body).toBe('Looks good');
    expect(row?.createdAt).toBeInstanceOf(Date);

    // Boundary: exactly 1 and exactly 2000 characters are accepted.
    const one = await request(app).post(url).set(asUser(world.owner.id)).send({ body: 'x' });
    expect(one.status).toBe(201);
    const max = await request(app)
      .post(url)
      .set(asUser(world.owner.id))
      .send({ body: 'y'.repeat(2000) });
    expect(max.status).toBe(201);
    expect(max.body.body).toHaveLength(2000);
    expect(await Comment.count({ where: { taskId: world.taskId } })).toBe(5);
  });

  it('FR-CMT-001: Invalid body', async () => {
    const url = `/tasks/${world.taskId}/comments`;
    const before = await Comment.count();
    const bodies = ['', '   ', 'z'.repeat(2001)];
    for (const body of bodies) {
      const response = await request(app).post(url).set(asUser(world.member.id)).send({ body });
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
    const missing = await request(app).post(url).set(asUser(world.member.id)).send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe('VALIDATION_ERROR');
    expect(await Comment.count()).toBe(before);
  });

  it('FR-CMT-001: Non-member or archived', async () => {
    const url = `/tasks/${world.taskId}/comments`;
    const before = await Comment.count();

    const outsider = await request(app)
      .post(url)
      .set(asUser(world.outsider.id))
      .send({ body: 'sneaky' });
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');

    const unauthenticated = await request(app).post(url).send({ body: 'anon' });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHORIZED');

    const archive = await request(app)
      .post(`/tasks/${world.taskId}/archive`)
      .set(asUser(world.owner.id));
    expect(archive.status).toBe(200);
    const archived = await request(app)
      .post(url)
      .set(asUser(world.member.id))
      .send({ body: 'too late' });
    expect(archived.status).toBe(409);
    expect(archived.body.error.code).toBe('TASK_ARCHIVED');
    expect(await Comment.count()).toBe(before);
  });

  it('FR-CMT-002: Author edits', async () => {
    const before = await Comment.findByPk(world.memberCommentId);
    expect(before?.editedAt).toBeNull();
    const response = await request(app)
      .patch(`/comments/${world.memberCommentId}`)
      .set(asUser(world.member.id))
      .send({ body: 'member edited' });
    expect(response.status).toBe(200);
    expect(response.body.body).toBe('member edited');
    expect(response.body.editedAt).not.toBeNull();

    const row = await Comment.findByPk(world.memberCommentId);
    expect(row?.body).toBe('member edited');
    expect(row?.editedAt).toBeInstanceOf(Date);
    expect(row?.authorId).toBe(world.member.id);
    expect(row?.createdAt.getTime()).toBe(before?.createdAt.getTime());
  });

  it('FR-CMT-002: Other user edits', async () => {
    const forbidden = [world.owner.id, world.spare.id];
    for (const userId of forbidden) {
      const response = await request(app)
        .patch(`/comments/${world.memberCommentId}`)
        .set(asUser(userId))
        .send({ body: 'hijacked' });
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
    const outsider = await request(app)
      .patch(`/comments/${world.memberCommentId}`)
      .set(asUser(world.outsider.id))
      .send({ body: 'hijacked' });
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');

    const row = await Comment.findByPk(world.memberCommentId);
    expect(row?.body).toBe('member says');
    expect(row?.editedAt).toBeNull();
  });

  it('FR-CMT-003: Author or Owner deletes', async () => {
    const author = await request(app)
      .delete(`/comments/${world.memberCommentId}`)
      .set(asUser(world.member.id));
    expect(author.status).toBe(204);
    expect(await Comment.findByPk(world.memberCommentId)).toBeNull();

    const extra = await request(app)
      .post(`/tasks/${world.taskId}/comments`)
      .set(asUser(world.spare.id))
      .send({ body: 'spare says' });
    const owner = await request(app)
      .delete(`/comments/${extra.body.id}`)
      .set(asUser(world.owner.id));
    expect(owner.status).toBe(204);
    expect(await Comment.findByPk(extra.body.id)).toBeNull();

    const list = await request(app)
      .get(`/tasks/${world.taskId}/comments`)
      .set(asUser(world.owner.id));
    expect(list.status).toBe(200);
    const ids = (list.body.items as { id: string }[]).map((item) => item.id);
    expect(ids).toEqual([world.ownerCommentId]);
    expect(list.body.meta.total).toBe(1);
  });

  it('FR-CMT-003: Other member deletes', async () => {
    const other = await request(app)
      .delete(`/comments/${world.memberCommentId}`)
      .set(asUser(world.spare.id));
    expect(other.status).toBe(403);
    expect(other.body.error.code).toBe('FORBIDDEN');
    const ownerComment = await request(app)
      .delete(`/comments/${world.ownerCommentId}`)
      .set(asUser(world.member.id));
    expect(ownerComment.status).toBe(403);
    expect(ownerComment.body.error.code).toBe('FORBIDDEN');

    const outsider = await request(app)
      .delete(`/comments/${world.memberCommentId}`)
      .set(asUser(world.outsider.id));
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');

    const unauthenticated = await request(app).delete(`/comments/${world.memberCommentId}`);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHORIZED');
    expect(await Comment.count({ where: { taskId: world.taskId } })).toBe(2);
  });

  it('FR-CMT-004: Chronological page', async () => {
    const url = `/tasks/${world.taskId}/comments`;
    for (const body of ['third', 'fourth', 'fifth']) {
      const response = await request(app).post(url).set(asUser(world.owner.id)).send({ body });
      expect(response.status).toBe(201);
    }
    const first = await request(app).get(url).set(asUser(world.member.id)).query({ pageSize: 2 });
    expect(first.status).toBe(200);
    expect((first.body.items as { body: string }[]).map((item) => item.body)).toEqual([
      'owner says',
      'member says',
    ]);
    expect(first.body.items[0].author.name).toBe('Owner');
    expect(first.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });

    const last = await request(app)
      .get(url)
      .set(asUser(world.member.id))
      .query({ page: 3, pageSize: 2 });
    expect((last.body.items as { body: string }[]).map((item) => item.body)).toEqual(['fifth']);
    expect(last.body.meta).toEqual({ page: 3, pageSize: 2, total: 5, totalPages: 3 });

    const all = await request(app).get(url).set(asUser(world.member.id));
    expect(all.body.meta).toEqual({ page: 1, pageSize: 20, total: 5, totalPages: 1 });
    const times = (all.body.items as { createdAt: string }[]).map((item) => item.createdAt);
    expect([...times].sort()).toEqual(times);

    // Boundary: pageSize 100 is accepted, 101 is rejected.
    const max = await request(app).get(url).set(asUser(world.member.id)).query({ pageSize: 100 });
    expect(max.status).toBe(200);
    const over = await request(app).get(url).set(asUser(world.member.id)).query({ pageSize: 101 });
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-CMT-004: Non-member lists', async () => {
    const response = await request(app)
      .get(`/tasks/${world.taskId}/comments`)
      .set(asUser(world.outsider.id));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.items).toBeUndefined();
    const unauthenticated = await request(app).get(`/tasks/${world.taskId}/comments`);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHORIZED');
  });

  it('FR-ACT-001: Entry stored', async () => {
    const owner = asUser(world.owner.id);
    const created = await request(app)
      .post(`/projects/${world.projectId}/tasks`)
      .set(owner)
      .send({ title: 'Journey', priority: 'HIGH' });
    expect(created.status).toBe(201);
    const taskId = created.body.id as string;
    expect(await Activity.count({ where: { taskId } })).toBe(1);

    await request(app).patch(`/tasks/${taskId}`).set(owner).send({ title: 'Renamed' });
    expect(await Activity.count({ where: { taskId } })).toBe(2);
    await request(app)
      .patch(`/tasks/${taskId}/assignee`)
      .set(owner)
      .send({ assigneeId: world.member.id });
    expect(await Activity.count({ where: { taskId } })).toBe(3);
    await request(app).patch(`/tasks/${taskId}/status`).set(owner).send({ status: 'IN_PROGRESS' });
    expect(await Activity.count({ where: { taskId } })).toBe(4);
    await request(app).post(`/tasks/${taskId}/archive`).set(owner);
    expect(await Activity.count({ where: { taskId } })).toBe(5);

    const items = await listActivity(taskId, world.owner.id);
    // Newest first.
    expect(items.map((item) => item.action)).toEqual([
      'TASK_ARCHIVED',
      'TASK_STATUS_CHANGED',
      'TASK_ASSIGNED',
      'TASK_UPDATED',
      'TASK_CREATED',
    ]);
    for (const item of items) {
      expect(item.actor).toEqual({ id: world.owner.id, name: 'Owner' });
      expect(Number.isNaN(Date.parse(item.createdAt))).toBe(false);
    }
    expect(items[0]?.metadata).toEqual({});
    expect(items[1]?.metadata).toEqual({ from: 'TODO', to: 'IN_PROGRESS' });
    expect(items[2]?.metadata).toEqual({ from: null, to: world.member.id });
    expect(items[3]?.metadata).toEqual({ changes: { title: { from: 'Journey', to: 'Renamed' } } });
    expect(items[4]?.metadata).toEqual({ title: 'Journey', status: 'TODO', priority: 'HIGH' });
  });

  it('FR-ACT-001: Rollback leaves no entry', async () => {
    // A status change that the rules reject changes nothing and stores no entry.
    const rejected = await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.owner.id))
      .send({ status: 'DONE' });
    expect(rejected.status).toBe(409);
    expect(await Activity.count()).toBe(0);

    // NFR-REL-001: a failing activity insert rolls the change back (no task row, no entry).
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
    const tasksBefore = await Task.count();
    const createFailed = await request(failing)
      .post(`/projects/${world.projectId}/tasks`)
      .set(asUser(world.owner.id))
      .send({ title: 'Never stored' });
    expect(createFailed.status).toBe(500);
    expect(await Task.count()).toBe(tasksBefore);
    const archiveFailed = await request(failing)
      .post(`/tasks/${world.taskId}/archive`)
      .set(asUser(world.owner.id));
    expect(archiveFailed.status).toBe(500);
    expect((await Task.findByPk(world.taskId))?.archivedAt).toBeNull();
    expect(await Activity.count()).toBe(0);

    // The real activity service inside a transaction that later rolls back stores nothing.
    const service = new ActivityService();
    await expect(
      getSequelize().transaction(async (tx) => {
        await service.record(tx, {
          taskId: world.taskId,
          actorId: world.owner.id,
          action: 'TASK_ARCHIVED',
          metadata: {},
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(await Activity.count()).toBe(0);
  });

  it('FR-ACT-001: Append-only', async () => {
    const owner = asUser(world.owner.id);
    await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(owner)
      .send({ status: 'IN_PROGRESS' });
    const entry = await Activity.findOne({ where: { taskId: world.taskId } });
    expect(entry).not.toBeNull();
    const urls = [
      `/tasks/${world.taskId}/activity`,
      `/tasks/${world.taskId}/activity/${entry?.id}`,
    ];
    for (const url of urls) {
      for (const method of ['patch', 'put', 'delete'] as const) {
        const response = await request(app)[method](url).set(owner).send({});
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe('NOT_FOUND');
      }
    }
    expect(await Activity.count()).toBe(1);
    const row = await Activity.findByPk(entry?.id);
    expect(row?.action).toBe('TASK_STATUS_CHANGED');
  });

  it('FR-ACT-002: History', async () => {
    const owner = asUser(world.owner.id);
    await request(app)
      .patch(`/tasks/${world.taskId}/assignee`)
      .set(owner)
      .send({ assigneeId: world.member.id });
    await request(app)
      .patch(`/tasks/${world.taskId}/status`)
      .set(asUser(world.member.id))
      .send({ status: 'IN_PROGRESS' });
    await request(app).patch(`/tasks/${world.taskId}`).set(owner).send({ title: 'Second title' });

    const response = await request(app)
      .get(`/tasks/${world.taskId}/activity`)
      .set(asUser(world.member.id));
    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
    const items = response.body.items as ActivityItem[];
    expect(items.map((item) => item.action)).toEqual([
      'TASK_UPDATED',
      'TASK_STATUS_CHANGED',
      'TASK_ASSIGNED',
    ]);
    expect(items[0]?.actor.name).toBe('Owner');
    expect(items[1]?.actor).toEqual({ id: world.member.id, name: 'Member' });
    expect(items[1]?.metadata).toEqual({ from: 'TODO', to: 'IN_PROGRESS' });
    expect(items[0]?.metadata).toEqual({
      changes: { title: { from: 'First task', to: 'Second title' } },
    });
    const times = items.map((item) => Date.parse(item.createdAt));
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    // Pagination: pageSize 2 splits the three entries over two pages, newest first.
    const page2 = await request(app)
      .get(`/tasks/${world.taskId}/activity`)
      .set(owner)
      .query({ page: 2, pageSize: 2 });
    expect(page2.body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    expect((page2.body.items as ActivityItem[]).map((item) => item.action)).toEqual([
      'TASK_ASSIGNED',
    ]);
    const over = await request(app)
      .get(`/tasks/${world.taskId}/activity`)
      .set(owner)
      .query({ pageSize: 101 });
    expect(over.status).toBe(400);
    expect(over.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-ACT-002: Non-member views', async () => {
    const response = await request(app)
      .get(`/tasks/${world.taskId}/activity`)
      .set(asUser(world.outsider.id));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    const unauthenticated = await request(app).get(`/tasks/${world.taskId}/activity`);
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHORIZED');
  });
});
