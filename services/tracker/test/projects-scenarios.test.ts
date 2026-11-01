import { Activity, Project, ProjectMember, Task } from '@app/database';
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

// Spec scenarios of capability `projects` (dev-10-projects) that need real rows.
describe('projects scenarios against the database', () => {
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

  it('FR-PROJ-002: List own projects', async () => {
    const other = await Project.create({ name: 'Other', ownerId: world.outsider.id });
    await ProjectMember.create({ projectId: other.id, userId: world.outsider.id, role: 'OWNER' });
    const old = await Project.create({
      name: 'Old',
      ownerId: world.owner.id,
      status: 'ARCHIVED',
      archivedAt: new Date(),
    });
    await ProjectMember.create({ projectId: old.id, userId: world.owner.id, role: 'OWNER' });

    const active = await request(app).get('/projects').set(asUser(world.owner.id));
    expect(active.status).toBe(200);
    expect(active.body.items.map((p: { name: string }) => p.name)).toEqual(['Alpha']);

    const all = await request(app)
      .get('/projects?includeArchived=true')
      .set(asUser(world.owner.id));
    expect(all.body.items.map((p: { name: string }) => p.name).sort()).toEqual(['Alpha', 'Old']);
  });

  it('FR-PROJ-002: Member views project', async () => {
    const response = await request(app)
      .get(`/projects/${world.projectId}`)
      .set(asUser(world.member.id));
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(world.projectId);
    expect(response.body.myRole).toBe('MEMBER');
    expect(response.body.members).toHaveLength(3);
  });

  it('FR-PROJ-003: Owner updates', async () => {
    const response = await request(app)
      .patch(`/projects/${world.projectId}`)
      .set(asUser(world.owner.id))
      .send({ name: 'Beta', description: 'new' });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Beta');
    expect(response.body.description).toBe('new');
  });

  it('FR-AUTH-006: Non-member updates', async () => {
    const response = await request(app)
      .patch(`/projects/${world.projectId}`)
      .set(asUser(world.outsider.id))
      .send({ name: 'Beta' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-PROJ-003: Archived project', async () => {
    await Project.update(
      { status: 'ARCHIVED', archivedAt: new Date() },
      { where: { id: world.projectId } },
    );
    const response = await request(app)
      .patch(`/projects/${world.projectId}`)
      .set(asUser(world.owner.id))
      .send({ name: 'Beta' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('PROJECT_ARCHIVED');
  });

  it('FR-PROJ-004: Owner archives', async () => {
    const response = await request(app)
      .post(`/projects/${world.projectId}/archive`)
      .set(asUser(world.owner.id));
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ARCHIVED');
    expect(response.body.archivedAt).not.toBeNull();
  });

  it('FR-PROJ-004: Member archives', async () => {
    const url = `/projects/${world.projectId}/archive`;
    const member = await request(app).post(url).set(asUser(world.member.id));
    expect(member.status).toBe(403);
    expect(member.body.error.code).toBe('FORBIDDEN');
    const outsider = await request(app).post(url).set(asUser(world.outsider.id));
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-PROJ-005: Unknown email', async () => {
    const response = await request(app)
      .post(`/projects/${world.projectId}/members`)
      .set(asUser(world.owner.id))
      .send({ email: 'nobody@example.com' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('FR-AUTH-006: Member adds member', async () => {
    const url = `/projects/${world.projectId}/members`;
    const body = { email: world.outsider.email };
    const member = await request(app).post(url).set(asUser(world.member.id)).send(body);
    expect(member.status).toBe(403);
    expect(member.body.error.code).toBe('FORBIDDEN');
    const outsider = await request(app).post(url).set(asUser(world.outsider.id)).send(body);
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-PROJ-006: Assigned tasks unassigned', async () => {
    const second = await Task.create({
      projectId: world.projectId,
      title: 'Second',
      createdById: world.owner.id,
      assigneeId: world.spare.id,
    });
    await Task.update({ assigneeId: world.spare.id }, { where: { id: world.taskId } });

    const response = await request(app)
      .delete(`/projects/${world.projectId}/members/${world.spare.id}`)
      .set(asUser(world.owner.id));
    expect(response.status).toBe(204);

    const tasks = await Task.findAll({ where: { projectId: world.projectId } });
    expect(tasks.every((t) => t.assigneeId === null)).toBe(true);
    const entries = await Activity.findAll({ where: { action: 'TASK_ASSIGNED' } });
    expect(entries.map((e) => e.taskId).sort()).toEqual([world.taskId, second.id].sort());
    expect(await ProjectMember.count({ where: { userId: world.spare.id } })).toBe(0);
  });

  it('FR-AUTH-006: Member removes member', async () => {
    const url = `/projects/${world.projectId}/members/${world.spare.id}`;
    const member = await request(app).delete(url).set(asUser(world.member.id));
    expect(member.status).toBe(403);
    expect(member.body.error.code).toBe('FORBIDDEN');
    const outsider = await request(app).delete(url).set(asUser(world.outsider.id));
    expect(outsider.status).toBe(404);
    expect(outsider.body.error.code).toBe('NOT_FOUND');
    expect(await ProjectMember.count({ where: { userId: world.spare.id } })).toBe(1);
  });
});
