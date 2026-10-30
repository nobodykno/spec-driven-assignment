import { Project, ProjectMember, Task, User, type Transaction } from '@app/database';
import { AppError } from '@app/shared';

export type TaskRecord = Task & { project: Project; assignee: User | null; createdBy: User };
export type MembershipRecord = ProjectMember & { project: Project };

function notFound(what: string): AppError {
  return new AppError('NOT_FOUND', 404, `${what} not found`);
}

// SDS §7.3 / D1: membership is part of the query; a non-member sees the same 404 as a missing row.
export async function findTaskForMember(
  taskId: string,
  userId: string,
  tx?: Transaction,
): Promise<TaskRecord> {
  const task = await Task.findOne({
    where: { id: taskId },
    include: [
      {
        model: Project,
        as: 'project',
        required: true,
        include: [{ model: ProjectMember, as: 'memberships', where: { userId }, required: true }],
      },
      { model: User, as: 'assignee', required: false },
      { model: User, as: 'createdBy', required: true },
    ],
    transaction: tx,
  });
  if (!task) {
    throw notFound('Task');
  }
  return task as TaskRecord;
}

export async function findMembership(
  projectId: string,
  userId: string,
  tx?: Transaction,
): Promise<MembershipRecord> {
  const membership = await ProjectMember.findOne({
    where: { projectId, userId },
    include: [{ model: Project, as: 'project', required: true }],
    transaction: tx,
  });
  if (!membership) {
    throw notFound('Project');
  }
  return membership as MembershipRecord;
}

export async function isProjectMember(
  projectId: string,
  userId: string,
  tx?: Transaction,
): Promise<boolean> {
  return (await ProjectMember.count({ where: { projectId, userId }, transaction: tx })) > 0;
}

// D2
export function assertWritable(project: Project, task?: Task): void {
  if (project.status === 'ARCHIVED') {
    throw new AppError('PROJECT_ARCHIVED', 409, 'Project is archived');
  }
  if (task?.archivedAt) {
    throw new AppError('TASK_ARCHIVED', 409, 'Task is archived');
  }
}
