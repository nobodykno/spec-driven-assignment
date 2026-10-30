import { type Comment, type ProjectRole } from '@app/shared';

// FR-CMT-002: only the author edits.
export function canEditComment(comment: Comment, userId: string): boolean {
  return comment.author.id === userId;
}

// FR-CMT-003: the author or a project Owner deletes. The API still enforces both rules.
export function canDeleteComment(comment: Comment, userId: string, role: ProjectRole): boolean {
  return comment.author.id === userId || role === 'OWNER';
}
