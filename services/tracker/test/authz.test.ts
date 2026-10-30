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

// FRS §2.2 as data: one row per action, the expected status for each role.
type Role = 'owner' | 'member' | 'nonMember';
interface Call {
  method: 'get' | 'post' | 'patch' | 'delete';
  path: string;
  body?: Record<string, unknown>;
}
interface Row {
  id: string;
  action: string;
  call: (world: World, role: Role) => Call;
  expected: Record<Role, number>;
}

const ownComment = (world: World, role: Role): string =>
  role === 'member' ? world.memberCommentId : world.ownerCommentId;
const otherComment = (world: World, role: Role): string =>
  role === 'member' ? world.ownerCommentId : world.memberCommentId;

const MATRIX: Row[] = [
  {
    id: 'FR-PROJ-002',
    action: 'view project',
    call: (w) => ({ method: 'get', path: `/projects/${w.projectId}` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-TASK-002',
    action: 'list tasks',
    call: (w) => ({ method: 'get', path: `/projects/${w.projectId}/tasks` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-TASK-002',
    action: 'view task',
    call: (w) => ({ method: 'get', path: `/tasks/${w.taskId}` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-CMT-004',
    action: 'list comments',
    call: (w) => ({ method: 'get', path: `/tasks/${w.taskId}/comments` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-ACT-002',
    action: 'view activity',
    call: (w) => ({ method: 'get', path: `/tasks/${w.taskId}/activity` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-PROJ-003',
    action: 'update project',
    call: (w) => ({ method: 'patch', path: `/projects/${w.projectId}`, body: { name: 'Beta' } }),
    expected: { owner: 200, member: 403, nonMember: 404 },
  },
  {
    id: 'FR-PROJ-004',
    action: 'archive project',
    call: (w) => ({ method: 'post', path: `/projects/${w.projectId}/archive` }),
    expected: { owner: 200, member: 403, nonMember: 404 },
  },
  {
    id: 'FR-PROJ-005',
    action: 'add member',
    call: (w) => ({
      method: 'post',
      path: `/projects/${w.projectId}/members`,
      body: { email: w.outsider.email },
    }),
    expected: { owner: 201, member: 403, nonMember: 404 },
  },
  {
    id: 'FR-PROJ-006',
    action: 'remove member',
    call: (w) => ({ method: 'delete', path: `/projects/${w.projectId}/members/${w.spare.id}` }),
    expected: { owner: 204, member: 403, nonMember: 404 },
  },
  {
    id: 'FR-TASK-001',
    action: 'create task',
    call: (w) => ({
      method: 'post',
      path: `/projects/${w.projectId}/tasks`,
      body: { title: 'New' },
    }),
    expected: { owner: 201, member: 201, nonMember: 404 },
  },
  {
    id: 'FR-TASK-003',
    action: 'update task',
    call: (w) => ({ method: 'patch', path: `/tasks/${w.taskId}`, body: { title: 'Renamed' } }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-TASK-004',
    action: 'assign task',
    call: (w) => ({
      method: 'patch',
      path: `/tasks/${w.taskId}/assignee`,
      body: { assigneeId: w.member.id },
    }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-TASK-005',
    action: 'change task status',
    call: (w) => ({
      method: 'patch',
      path: `/tasks/${w.taskId}/status`,
      body: { status: 'IN_PROGRESS' },
    }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-TASK-006',
    action: 'archive task',
    call: (w) => ({ method: 'post', path: `/tasks/${w.taskId}/archive` }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-CMT-001',
    action: 'add comment',
    call: (w) => ({
      method: 'post',
      path: `/tasks/${w.taskId}/comments`,
      body: { body: 'hello' },
    }),
    expected: { owner: 201, member: 201, nonMember: 404 },
  },
  {
    id: 'FR-CMT-002',
    action: 'edit own comment',
    call: (w, role) => ({
      method: 'patch',
      path: `/comments/${ownComment(w, role)}`,
      body: { body: 'edited' },
    }),
    expected: { owner: 200, member: 200, nonMember: 404 },
  },
  {
    id: 'FR-CMT-002',
    action: "edit someone else's comment",
    call: (w, role) => ({
      method: 'patch',
      path: `/comments/${otherComment(w, role)}`,
      body: { body: 'edited' },
    }),
    expected: { owner: 403, member: 403, nonMember: 404 },
  },
  {
    id: 'FR-CMT-003',
    action: 'delete own comment',
    call: (w, role) => ({ method: 'delete', path: `/comments/${ownComment(w, role)}` }),
    expected: { owner: 204, member: 204, nonMember: 404 },
  },
  {
    id: 'FR-CMT-003',
    action: "delete someone else's comment",
    call: (w, role) => ({ method: 'delete', path: `/comments/${otherComment(w, role)}` }),
    expected: { owner: 204, member: 403, nonMember: 404 },
  },
];

const ROLES: Role[] = ['owner', 'member', 'nonMember'];
const ACTOR: Record<Role, (world: World) => string> = {
  owner: (w) => w.owner.id,
  member: (w) => w.member.id,
  nonMember: (w) => w.outsider.id,
};

describe('authorization matrix (FRS §2.2)', () => {
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

  describe.each(MATRIX)('$action', ({ id, action, call, expected }) => {
    it.each(ROLES)(`${id}: ${action} as %s gets the status FRS §2.2 gives`, async (role) => {
      const { method, path, body } = call(world, role);
      const response = await request(app)
        [method](path)
        .set(asUser(ACTOR[role](world)))
        .send(body);
      expect(response.status).toBe(expected[role]);
      if (expected[role] === 403 || expected[role] === 404) {
        expect(response.body.error.code).toBe(expected[role] === 403 ? 'FORBIDDEN' : 'NOT_FOUND');
      }
    });
  });

  it('FR-PROJ-002: a non-member gets the same 404 body as for a project that does not exist', async () => {
    const real = await request(app)
      .get(`/projects/${world.projectId}`)
      .set(asUser(world.outsider.id));
    const missing = await request(app)
      .get('/projects/00000000-0000-4000-8000-000000000000')
      .set(asUser(world.outsider.id));
    expect(real.status).toBe(404);
    expect(real.body).toEqual(missing.body);
  });

  it('FR-AUTH-005: a request without the internal token is 401', async () => {
    const response = await request(app).get(`/projects/${world.projectId}`);
    expect(response.status).toBe(401);
  });
});
