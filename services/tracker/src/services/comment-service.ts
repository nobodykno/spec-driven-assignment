import { Comment, Project, ProjectMember, Task, User } from '@app/database';
import {
  AppError,
  buildPaginated,
  type Comment as CommentDto,
  type Paginated,
  type PaginationQuery,
  type ProjectRole,
} from '@app/shared';
import { assertWritable, findTaskForMember } from './task-access.js';

const AUTHOR_INCLUDE = { model: User, as: 'author', required: true } as const;

function toCommentDto(comment: Comment): CommentDto {
  return {
    id: comment.id,
    taskId: comment.taskId,
    author: { id: comment.authorId, name: comment.author?.name ?? '' },
    body: comment.body,
    editedAt: comment.editedAt ? comment.editedAt.toISOString() : null,
    createdAt: comment.createdAt.toISOString(),
  };
}

function notFound(): AppError {
  return new AppError('NOT_FOUND', 404, 'Comment not found');
}

interface CommentAccess {
  comment: Comment;
  task: Task;
  project: Project;
  role: ProjectRole;
}

export class CommentService {
  // FR-CMT-001
  async add(userId: string, taskId: string, body: string): Promise<CommentDto> {
    const task = await findTaskForMember(taskId, userId);
    assertWritable(task.project, task);
    const created = await Comment.create({ taskId, authorId: userId, body });
    return toCommentDto(await this.reload(created.id));
  }

  // FR-CMT-004: chronological, paginated.
  async list(
    userId: string,
    taskId: string,
    query: PaginationQuery,
  ): Promise<Paginated<CommentDto>> {
    await findTaskForMember(taskId, userId);
    const { rows, count } = await Comment.findAndCountAll({
      where: { taskId },
      include: [AUTHOR_INCLUDE],
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
    return buildPaginated(rows.map(toCommentDto), count, query.page, query.pageSize);
  }

  // FR-CMT-002: only the author may edit.
  async edit(userId: string, commentId: string, body: string): Promise<CommentDto> {
    const { comment, task, project } = await this.requireAccess(userId, commentId);
    if (comment.authorId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'Only the author can edit a comment');
    }
    assertWritable(project, task);
    await comment.update({ body, editedAt: new Date() });
    return toCommentDto(await this.reload(comment.id));
  }

  // FR-CMT-003: the author or a project Owner may delete (soft delete).
  async remove(userId: string, commentId: string): Promise<void> {
    const { comment, task, project, role } = await this.requireAccess(userId, commentId);
    if (comment.authorId !== userId && role !== 'OWNER') {
      throw new AppError('FORBIDDEN', 403, 'Only the author or an owner can delete a comment');
    }
    assertWritable(project, task);
    await comment.destroy();
  }

  // SDS §7.3: a missing comment and a comment in a project the user is not in are both 404.
  private async requireAccess(userId: string, commentId: string): Promise<CommentAccess> {
    const comment = await Comment.findOne({
      where: { id: commentId },
      include: [
        { model: Task, as: 'task', required: true, include: [{ model: Project, as: 'project' }] },
      ],
    });
    const task = comment?.task;
    const project = task?.project;
    if (!comment || !task || !project) {
      throw notFound();
    }
    const membership = await ProjectMember.findOne({ where: { projectId: project.id, userId } });
    if (!membership) {
      throw notFound();
    }
    return { comment, task, project, role: membership.role };
  }

  private async reload(commentId: string): Promise<Comment> {
    const comment = await Comment.findByPk(commentId, { include: [AUTHOR_INCLUDE] });
    if (!comment) {
      throw notFound();
    }
    return comment;
  }
}
