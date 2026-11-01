import { Activity, Project, ProjectMember, Task } from '@app/database';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asUser,
  buildRealApp,
  closeConnection,
  createUser,
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

  it('FR-PROJ-001: Valid project', async () => {
    const response = await request(app)
      .post('/projects')
      .set(asUser(world.outsider.id))
      .send({ name: 'Fresh', description: 'about it' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ACTIVE');
    expect(response.body.name).toBe('Fresh');

    const row = await Project.findByPk(response.body.id);
    expect(row?.status).toBe('ACTIVE');
    expect(row?.ownerId).toBe(world.outsider.id);
    const membership = await ProjectMember.findOne({
      where: { projectId: response.body.id, userId: world.outsider.id },
    });
    expect(membership?.role).toBe('OWNER');

    // Boundaries: name of exactly 100 characters and description of exactly 1000 are accepted.
    const edge = await request(app)
      .post('/projects')
      .set(asUser(world.outsider.id))
      .send({ name: 'n'.repeat(100), description: 'd'.repeat(1000) });
    expect(edge.status).toBe(201);
    expect(edge.body.name).toHaveLength(100);
    expect(edge.body.description).toHaveLength(1000);
    expect(await Project.count({ where: { ownerId: world.outsider.id } })).toBe(2);
  });

  it('FR-PROJ-005: Add user', async () => {
    const before = await request(app)
      .get(`/projects/${world.projectId}`)
      .set(asUser(world.outsider.id));
    expect(before.status).toBe(404);

    const response = await request(app)
      .post(`/projects/${world.projectId}/members`)
      .set(asUser(world.owner.id))
      .send({ email: world.outsider.email, role: 'MEMBER' });
    expect(response.status).toBe(201);
    expect(response.body.userId).toBe(world.outsider.id);

    const row = await ProjectMember.findOne({
      where: { projectId: world.projectId, userId: world.outsider.id },
    });
    expect(row?.role).toBe('MEMBER');
    const after = await request(app)
      .get(`/projects/${world.projectId}`)
      .set(asUser(world.outsider.id));
    expect(after.status).toBe(200);
    expect(after.body.myRole).toBe('MEMBER');
  });

  it('FR-PROJ-006: Remove member', async () => {
    const response = await request(app)
      .delete(`/projects/${world.projectId}/members/${world.spare.id}`)
      .set(asUser(world.owner.id));
    expect(response.status).toBe(204);
    expect(
      await ProjectMember.count({ where: { projectId: world.projectId, userId: world.spare.id } }),
    ).toBe(0);
    const after = await request(app)
      .get(`/projects/${world.projectId}`)
      .set(asUser(world.spare.id));
    expect(after.status).toBe(404);
    expect(after.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-PROJ-006: Last owner', async () => {
    const response = await request(app)
      .delete(`/projects/${world.projectId}/members/${world.owner.id}`)
      .set(asUser(world.owner.id));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('LAST_OWNER');
    const row = await ProjectMember.findOne({
      where: { projectId: world.projectId, userId: world.owner.id },
    });
    expect(row?.role).toBe('OWNER');
  });

  it('FR-PROJ-006: concurrent removal of two owners keeps one owner', async () => {
    const rounds = 20;
    for (let round = 0; round < rounds; round += 1) {
      const a = await createUser(`RaceA${round}`);
      const b = await createUser(`RaceB${round}`);
      const project = await Project.create({ name: `Race ${round}`, ownerId: a.id });
      await ProjectMember.bulkCreate([
        { projectId: project.id, userId: a.id, role: 'OWNER' },
        { projectId: project.id, userId: b.id, role: 'OWNER' },
      ]);

      const [first, second] = await Promise.all([
        request(app).delete(`/projects/${project.id}/members/${b.id}`).set(asUser(a.id)),
        request(app).delete(`/projects/${project.id}/members/${a.id}`).set(asUser(b.id)),
      ]);

      const owners = await ProjectMember.count({
        where: { projectId: project.id, role: 'OWNER' },
      });
      expect(owners, `round ${round}: project left without an owner`).toBeGreaterThanOrEqual(1);
      // One removal wins; the other is refused (409 LAST_OWNER) or, once the winner has
      // removed the caller, no longer authorised (404).
      const succeeded = [first.status, second.status].filter((s) => s === 204);
      expect(succeeded, `round ${round}: both removals succeeded`).toHaveLength(1);
      const loser = first.status === 204 ? second : first;
      expect([404, 409]).toContain(loser.status);
    }
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
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      expect(entry.actorId).toBe(world.owner.id);
      expect(entry.metadata).toEqual({ from: world.spare.id, to: null });
    }
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
