import {
  Activity,
  Project,
  ProjectMember,
  Task,
  User,
  getSequelize,
  type Transaction,
} from '@app/database';
import {
  AppError,
  type AddMemberInput,
  type CreateProjectInput,
  type Project as ProjectDto,
  type ProjectDetail,
  type ProjectListItem,
  type ProjectMember as ProjectMemberDto,
  type ProjectRole,
  type UpdateProjectInput,
} from '@app/shared';
import { assertProjectActive, requireProjectRole } from './project-access.js';

const ANY_ROLE: readonly ProjectRole[] = ['OWNER', 'MEMBER'];
const OWNER_ONLY: readonly ProjectRole[] = ['OWNER'];

export function toProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? null,
    status: project.status ?? 'ACTIVE',
    ownerId: project.ownerId,
    archivedAt: project.archivedAt ? project.archivedAt.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function toMemberDto(member: ProjectMember): ProjectMemberDto {
  return {
    userId: member.userId,
    name: member.user?.name ?? '',
    email: member.user?.email ?? '',
    role: member.role,
  };
}

export class ProjectService {
  // FR-PROJ-001: the project and its OWNER membership are created together.
  async create(userId: string, input: CreateProjectInput): Promise<ProjectDetail> {
    const project = await getSequelize().transaction(async (tx: Transaction) => {
      const created = await Project.create(
        { name: input.name, description: input.description ?? null, ownerId: userId },
        { transaction: tx },
      );
      await ProjectMember.create(
        { projectId: created.id, userId, role: 'OWNER' },
        { transaction: tx },
      );
      return created;
    });
    return this.get(userId, project.id);
  }

  // FR-PROJ-002: only the caller's projects; archived ones on request.
  async list(userId: string, includeArchived: boolean): Promise<{ items: ProjectListItem[] }> {
    const memberships = await ProjectMember.findAll({
      where: { userId },
      include: [
        {
          model: Project,
          as: 'project',
          required: true,
          ...(includeArchived ? {} : { where: { status: 'ACTIVE' } }),
        },
      ],
      order: [[{ model: Project, as: 'project' }, 'createdAt', 'DESC']],
    });
    const items = memberships.flatMap((membership) =>
      membership.project ? [{ ...toProjectDto(membership.project), myRole: membership.role }] : [],
    );
    return { items };
  }

  // FR-PROJ-002
  async get(userId: string, projectId: string): Promise<ProjectDetail> {
    const { project, role } = await requireProjectRole(projectId, userId, ANY_ROLE);
    const members = await ProjectMember.findAll({
      where: { projectId },
      include: [{ model: User, as: 'user', required: true }],
      order: [['createdAt', 'ASC']],
    });
    return { ...toProjectDto(project), members: members.map(toMemberDto), myRole: role };
  }

  // FR-PROJ-003
  async update(
    userId: string,
    projectId: string,
    input: UpdateProjectInput,
  ): Promise<ProjectDetail> {
    const { project } = await requireProjectRole(projectId, userId, OWNER_ONLY);
    assertProjectActive(project);
    await project.update({
      name: input.name ?? project.name,
      description: input.description === undefined ? project.description : input.description,
    });
    return this.get(userId, projectId);
  }

  // FR-PROJ-004
  async archive(userId: string, projectId: string): Promise<ProjectDetail> {
    const { project } = await requireProjectRole(projectId, userId, OWNER_ONLY);
    assertProjectActive(project);
    await project.update({ status: 'ARCHIVED', archivedAt: new Date() });
    return this.get(userId, projectId);
  }

  // FR-PROJ-005
  async addMember(
    userId: string,
    projectId: string,
    input: AddMemberInput,
  ): Promise<ProjectMemberDto> {
    const { project } = await requireProjectRole(projectId, userId, OWNER_ONLY);
    assertProjectActive(project);
    const user = await User.findOne({ where: { email: input.email } });
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'No registered user has that email');
    }
    const existing = await ProjectMember.findOne({ where: { projectId, userId: user.id } });
    if (existing) {
      throw new AppError('ALREADY_MEMBER', 409, 'User is already a member');
    }
    await ProjectMember.create({ projectId, userId: user.id, role: input.role });
    return { userId: user.id, name: user.name, email: user.email, role: input.role };
  }

  // FR-PROJ-006
  async removeMember(userId: string, projectId: string, targetUserId: string): Promise<void> {
    const { project } = await requireProjectRole(projectId, userId, OWNER_ONLY);
    assertProjectActive(project);
    const target = await ProjectMember.findOne({ where: { projectId, userId: targetUserId } });
    if (!target) {
      throw new AppError('NOT_FOUND', 404, 'Member not found');
    }
    if (target.role === 'OWNER') {
      await this.assertAnotherOwner(projectId);
    }
    await getSequelize().transaction(async (tx: Transaction) => {
      await this.unassignTasks(projectId, targetUserId, userId, tx);
      await target.destroy({ transaction: tx });
    });
  }

  private async assertAnotherOwner(projectId: string): Promise<void> {
    const owners = await ProjectMember.count({ where: { projectId, role: 'OWNER' } });
    if (owners <= 1) {
      throw new AppError('LAST_OWNER', 409, 'A project must keep at least one owner');
    }
  }

  // FR-PROJ-006: the removed member's tasks become unassigned, one activity entry each.
  private async unassignTasks(
    projectId: string,
    removedUserId: string,
    actorId: string,
    tx: Transaction,
  ): Promise<void> {
    const tasks = await Task.findAll({
      where: { projectId, assigneeId: removedUserId },
      transaction: tx,
    });
    for (const task of tasks) {
      await task.update({ assigneeId: null }, { transaction: tx });
      await Activity.create(
        {
          taskId: task.id,
          actorId,
          action: 'TASK_ASSIGNED',
          metadata: { from: removedUserId, to: null },
        },
        { transaction: tx },
      );
    }
  }
}
