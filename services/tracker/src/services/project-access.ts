import { Project, ProjectMember } from '@app/database';
import { AppError, type ProjectRole } from '@app/shared';

export interface ProjectAccess {
  project: Project;
  role: ProjectRole;
}

// SDS §7.3: one membership-scoped query. No membership is a 404 so existence is not revealed
// (FR-AUTH-006); a member without the needed role is a 403.
export async function requireProjectRole(
  projectId: string,
  userId: string,
  roles: readonly ProjectRole[],
): Promise<ProjectAccess> {
  const membership = await ProjectMember.findOne({
    where: { projectId, userId },
    include: [{ model: Project, as: 'project', required: true }],
  });
  if (!membership?.project) {
    throw new AppError('NOT_FOUND', 404, 'Project not found');
  }
  if (!roles.includes(membership.role)) {
    throw new AppError('FORBIDDEN', 403, 'You do not have permission to do this');
  }
  return { project: membership.project, role: membership.role };
}

// FR-PROJ-003 / FR-PROJ-004: archived projects are read-only.
export function assertProjectActive(project: Pick<Project, 'status'>): void {
  if (project.status === 'ARCHIVED') {
    throw new AppError('PROJECT_ARCHIVED', 409, 'Project is archived');
  }
}
