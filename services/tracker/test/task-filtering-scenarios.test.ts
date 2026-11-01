import { Comment, Task, getSequelize } from '@app/database';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asUser,
  buildRealApp,
  closeConnection,
  resetDatabase,
  seedWorld,
  type World,
} from './support/db.js';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

interface Seed {
  title: string;
  status?: Status;
  priority?: Priority;
  assigneeId?: string | null;
  dueDate?: string | null;
  archivedAt?: Date | null;
}

// Spec scenarios of capability `task-filtering` (dev-12-task-filtering) that need real rows.
describe('task filtering scenarios against the database', () => {
  const app = buildRealApp();
  let world: World;

  beforeEach(async () => {
    await resetDatabase();
    world = await seedWorld();
    // The world's own task would pollute counts; the scenarios seed their own rows.
    await Comment.destroy({ where: { taskId: world.taskId }, force: true });
    await Task.destroy({ where: { projectId: world.projectId } });
  });

  afterAll(async () => {
    await resetDatabase();
    await closeConnection();
  });

  async function seed(rows: Seed[]): Promise<void> {
    // Distinct created_at values (one second apart) keep createdAt ordering deterministic.
    const base = Date.now() - rows.length * 1000;
    for (const [index, row] of rows.entries()) {
      await Task.create({
        projectId: world.projectId,
        createdById: world.owner.id,
        createdAt: new Date(base + index * 1000),
        ...row,
      });
    }
  }

  async function list(query: string, userId = world.member.id): Promise<request.Response> {
    return request(app).get(`/projects/${world.projectId}/tasks${query}`).set(asUser(userId));
  }

  function titles(response: request.Response): string[] {
    return (response.body.items as { title: string }[]).map((item) => item.title);
  }

  it('FR-FILT-001: Status and priority', async () => {
    await seed([
      { title: 'todo-high', status: 'TODO', priority: 'HIGH' },
      { title: 'prog-high', status: 'IN_PROGRESS', priority: 'HIGH' },
      { title: 'todo-low', status: 'TODO', priority: 'LOW' },
      { title: 'done-high', status: 'DONE', priority: 'HIGH' },
      { title: 'review-high', status: 'IN_REVIEW', priority: 'HIGH' },
    ]);
    const response = await list('?status=TODO,IN_PROGRESS&priority=HIGH');
    expect(response.status).toBe(200);
    expect(titles(response).sort()).toEqual(['prog-high', 'todo-high']);
    expect(response.body.meta.total).toBe(2);

    // Values inside one filter combine with OR.
    const priorities = await list('?priority=LOW,HIGH&status=TODO');
    expect(titles(priorities).sort()).toEqual(['todo-high', 'todo-low']);

    // Due-date range is inclusive and combines with the other filters; undated rows never match.
    await seed([
      { title: 'd1', dueDate: '2026-12-01' },
      { title: 'd2', dueDate: '2026-12-10' },
      { title: 'd3', dueDate: '2026-12-20' },
    ]);
    const range = await list('?dueFrom=2026-12-01&dueTo=2026-12-10');
    expect(titles(range).sort()).toEqual(['d1', 'd2']);

    // Archived tasks are hidden unless includeArchived=true.
    await seed([{ title: 'old', archivedAt: new Date() }]);
    expect(titles(await list(''))).not.toContain('old');
    expect(titles(await list('?includeArchived=true'))).toContain('old');
  });

  it('FR-FILT-001: Assigned to me', async () => {
    await seed([
      { title: 'mine', assigneeId: world.member.id },
      { title: 'owners', assigneeId: world.owner.id },
      { title: 'nobody' },
    ]);
    const response = await list('?assigneeId=me');
    expect(response.status).toBe(200);
    expect(titles(response)).toEqual(['mine']);

    // "me" is the caller, not a fixed user.
    const asOwner = await list('?assigneeId=me', world.owner.id);
    expect(titles(asOwner)).toEqual(['owners']);

    // A concrete user id filters the same way.
    const byId = await list(`?assigneeId=${world.owner.id}`);
    expect(titles(byId)).toEqual(['owners']);
  });

  it('FR-FILT-001: Unassigned', async () => {
    await seed([{ title: 'mine', assigneeId: world.member.id }, { title: 'nobody' }]);
    const response = await list('?assigneeId=none');
    expect(response.status).toBe(200);
    expect(titles(response)).toEqual(['nobody']);
  });

  it('FR-FILT-001: Invalid filter', async () => {
    await seed([{ title: 'a' }]);
    for (const query of [
      '?status=NOPE',
      '?priority=BOGUS',
      '?assigneeId=someone',
      '?dueFrom=yesterday',
      '?bogus=1',
      '?status=',
    ]) {
      const response = await list(query);
      expect(response.status, query).toBe(400);
      expect(response.body.error.code, query).toBe('VALIDATION_ERROR');
    }
  });

  it('FR-FILT-001: Non-member lists', async () => {
    await seed([{ title: 'a' }]);
    const response = await list('', world.outsider.id);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.items).toBeUndefined();

    const unauthenticated = await request(app).get(`/projects/${world.projectId}/tasks`);
    expect(unauthenticated.status).toBe(401);
  });

  it('FR-FILT-002: Sort by due date', async () => {
    await seed([
      { title: 'none-1' },
      { title: 'late', dueDate: '2026-12-30' },
      { title: 'early', dueDate: '2026-12-01' },
      { title: 'mid', dueDate: '2026-12-15' },
    ]);
    const asc = await list('?sort=dueDate&order=asc');
    expect(asc.status).toBe(200);
    expect(titles(asc)).toEqual(['early', 'mid', 'late', 'none-1']);

    // Descending still puts tasks without a due date last.
    const desc = await list('?sort=dueDate&order=desc');
    expect(titles(desc)).toEqual(['late', 'mid', 'early', 'none-1']);
  });

  it('FR-FILT-002: Sort by priority', async () => {
    await seed([
      { title: 'low', priority: 'LOW' },
      { title: 'urgent', priority: 'URGENT' },
      { title: 'medium', priority: 'MEDIUM' },
      { title: 'high', priority: 'HIGH' },
    ]);
    const desc = await list('?sort=priority&order=desc');
    expect(desc.status).toBe(200);
    expect(titles(desc)).toEqual(['urgent', 'high', 'medium', 'low']);

    const asc = await list('?sort=priority&order=asc');
    expect(titles(asc)).toEqual(['low', 'medium', 'high', 'urgent']);
  });

  it('FR-FILT-002: Default and timestamp sorts', async () => {
    await seed([{ title: 'first' }, { title: 'second' }, { title: 'third' }]);
    // Default is createdAt descending.
    expect(titles(await list(''))).toEqual(['third', 'second', 'first']);
    expect(titles(await list('?sort=createdAt&order=asc'))).toEqual(['first', 'second', 'third']);

    const first = await Task.findOne({ where: { title: 'first' } });
    await first?.update({ description: 'touched' });
    expect(titles(await list('?sort=updatedAt&order=desc'))[0]).toBe('first');
    expect(titles(await list('?sort=updatedAt&order=asc'))[2]).toBe('first');
  });

  it('FR-FILT-002: Invalid sort field', async () => {
    const field = await list('?sort=title');
    expect(field.status).toBe(400);
    expect(field.body.error.code).toBe('VALIDATION_ERROR');
    const order = await list('?order=sideways');
    expect(order.status).toBe(400);
    expect(order.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('FR-FILT-003: Paged response', async () => {
    await seed(Array.from({ length: 25 }, (_, i) => ({ title: `t${String(i).padStart(2, '0')}` })));
    // Defaults: page 1, pageSize 20.
    const first = await list('?sort=createdAt&order=asc');
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(20);
    expect(first.body.meta).toEqual({ page: 1, pageSize: 20, total: 25, totalPages: 2 });

    const second = await list('?sort=createdAt&order=asc&page=2');
    expect(titles(second)).toEqual(['t20', 't21', 't22', 't23', 't24']);
    expect(second.body.meta).toEqual({ page: 2, pageSize: 20, total: 25, totalPages: 2 });

    // pageSize 100 is the maximum accepted; the total counts every match, not just the page.
    const max = await list('?pageSize=100');
    expect(max.status).toBe(200);
    expect(max.body.items).toHaveLength(25);
    expect(max.body.meta).toEqual({ page: 1, pageSize: 100, total: 25, totalPages: 1 });

    const small = await list('?pageSize=10&page=3&sort=createdAt&order=asc');
    expect(titles(small)).toEqual(['t20', 't21', 't22', 't23', 't24']);
    expect(small.body.meta.totalPages).toBe(3);

    // A page past the end is empty, with the true total.
    const beyond = await list('?page=9');
    expect(beyond.status).toBe(200);
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.meta.total).toBe(25);
  });

  it('FR-FILT-003: Page size too large', async () => {
    const tooBig = await list('?pageSize=101');
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.code).toBe('VALIDATION_ERROR');
    for (const query of ['?pageSize=0', '?page=0', '?page=abc']) {
      const response = await list(query);
      expect(response.status, query).toBe(400);
      expect(response.body.error.code, query).toBe('VALIDATION_ERROR');
    }
  });

  it('NFR-PERF-002: Indexes exist', async () => {
    const [rows] = await getSequelize().query(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'tasks'",
    );
    const defs = (rows as { indexdef: string }[]).map((row) => row.indexdef);
    for (const columns of [
      '(project_id, archived_at, status)',
      '(project_id, assignee_id)',
      '(project_id, due_date)',
      '(project_id, priority)',
    ]) {
      expect(
        defs.some((def) => def.endsWith(columns)),
        columns,
      ).toBe(true);
    }
  });
});
