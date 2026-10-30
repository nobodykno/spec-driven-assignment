import {
  Comment,
  Project,
  ProjectMember,
  Task,
  User,
  closeDatabase,
  getSequelize,
} from '@app/database';
import { pino } from 'pino';
import { createApp } from '../../src/app.js';

export const INTERNAL_TOKEN = 'internal';

/** The real app: real services and models against tracker_test, no mocks. */
export function buildRealApp(): ReturnType<typeof createApp> {
  return createApp({
    checkDatabase: async () => true,
    config: { internalToken: INTERNAL_TOKEN },
    logger: pino({ level: 'silent' }),
  });
}

/** Identity headers the gateway would forward after verifying the JWT. */
export function asUser(userId: string): Record<string, string> {
  return { 'x-internal-token': INTERNAL_TOKEN, 'x-user-id': userId, 'x-user-role': 'USER' };
}

/** SDS §11: tables are truncated between tests. */
export async function resetDatabase(): Promise<void> {
  await getSequelize().query(
    'TRUNCATE TABLE activities, comments, tasks, project_members, projects, refresh_tokens, users RESTART IDENTITY CASCADE',
  );
}

export async function closeConnection(): Promise<void> {
  await closeDatabase();
}

export async function createUser(label: string): Promise<{ id: string; email: string }> {
  const user = await User.create({
    name: label,
    email: `${label.toLowerCase()}@example.com`,
    passwordHash: 'not-a-real-hash',
  });
  return { id: user.id, email: user.email };
}

export interface World {
  owner: { id: string; email: string };
  member: { id: string; email: string };
  outsider: { id: string; email: string };
  spare: { id: string; email: string };
  projectId: string;
  taskId: string;
  ownerCommentId: string;
  memberCommentId: string;
}

/**
 * One project with an Owner, a Member and a spare Member (removable), a task and one comment by
 * each of Owner and Member. `outsider` is registered but belongs to no project.
 */
export async function seedWorld(): Promise<World> {
  const owner = await createUser('Owner');
  const member = await createUser('Member');
  const outsider = await createUser('Outsider');
  const spare = await createUser('Spare');
  const project = await Project.create({ name: 'Alpha', ownerId: owner.id });
  await ProjectMember.bulkCreate([
    { projectId: project.id, userId: owner.id, role: 'OWNER' },
    { projectId: project.id, userId: member.id, role: 'MEMBER' },
    { projectId: project.id, userId: spare.id, role: 'MEMBER' },
  ]);
  const task = await Task.create({
    projectId: project.id,
    title: 'First task',
    createdById: owner.id,
  });
  const ownerComment = await Comment.create({
    taskId: task.id,
    authorId: owner.id,
    body: 'owner says',
  });
  const memberComment = await Comment.create({
    taskId: task.id,
    authorId: member.id,
    body: 'member says',
  });
  return {
    owner,
    member,
    outsider,
    spare,
    projectId: project.id,
    taskId: task.id,
    ownerCommentId: ownerComment.id,
    memberCommentId: memberComment.id,
  };
}
