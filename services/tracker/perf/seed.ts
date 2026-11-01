import { Project, ProjectMember, Task, User, getSequelize } from '@app/database';

export const TASK_COUNT = 10_000;
const BATCH_SIZE = 1_000;
const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export interface PerfWorld {
  ownerId: string;
  projectId: string;
  assigneeId: string;
}

async function seedUsersAndProject(): Promise<{
  owner: User;
  one: User;
  two: User;
  project: Project;
}> {
  const users = await User.bulkCreate(
    ['PerfOwner', 'PerfOne', 'PerfTwo'].map((name) => ({
      name,
      email: `${name.toLowerCase()}@example.com`,
      passwordHash: 'not-a-real-hash',
    })),
  );
  const [owner, one, two] = users;
  if (!owner || !one || !two) {
    throw new Error('user seeding failed');
  }
  const project = await Project.create({ name: 'Perf', ownerId: owner.id });
  await ProjectMember.bulkCreate([
    { projectId: project.id, userId: owner.id, role: 'OWNER' },
    { projectId: project.id, userId: one.id, role: 'MEMBER' },
    { projectId: project.id, userId: two.id, role: 'MEMBER' },
  ]);
  return { owner, one, two, project };
}

function taskRow(
  n: number,
  projectId: string,
  createdById: string,
  assignees: (string | null)[],
): Record<string, unknown> {
  const due = new Date(Date.UTC(2027, 0, 1 + (n % 365)));
  return {
    projectId,
    title: `Perf task ${n}`,
    status: STATUSES[n % STATUSES.length],
    priority: PRIORITIES[n % PRIORITIES.length],
    assigneeId: assignees[n % assignees.length] ?? null,
    dueDate: n % 7 === 0 ? null : due.toISOString().slice(0, 10),
    createdById,
  };
}

/** One project with an owner, two members and 10,000 tasks spread over statuses, priorities, assignees and due dates. */
export async function seedPerfProject(): Promise<PerfWorld> {
  await getSequelize().query(
    'TRUNCATE TABLE activities, comments, tasks, project_members, projects, refresh_tokens, users RESTART IDENTITY CASCADE',
  );
  const { owner, one, two, project } = await seedUsersAndProject();
  const assignees = [one.id, two.id, null];
  for (let start = 0; start < TASK_COUNT; start += BATCH_SIZE) {
    const rows = Array.from({ length: BATCH_SIZE }, (_, offset) =>
      taskRow(start + offset, project.id, owner.id, assignees),
    );
    await Task.bulkCreate(rows);
  }
  return { ownerId: owner.id, projectId: project.id, assigneeId: one.id };
}
