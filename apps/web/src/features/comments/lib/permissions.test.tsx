import { type Comment } from '@app/shared';
import { describe, expect, it } from 'vitest';
import { canDeleteComment, canEditComment } from './permissions.ts';

const AUTHOR = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';

const comment: Comment = {
  id: '00000000-0000-4000-8000-0000000000cc',
  taskId: '00000000-0000-4000-8000-0000000000bb',
  author: { id: AUTHOR, name: 'Ada' },
  body: 'Hello',
  editedAt: null,
  createdAt: '2030-01-01T00:00:00.000Z',
};

describe('comment permissions', () => {
  it('FR-UI-008: only the author can edit', () => {
    expect(canEditComment(comment, AUTHOR)).toBe(true);
    expect(canEditComment(comment, OTHER)).toBe(false);
  });

  it('FR-UI-008: the author or an Owner can delete, a plain Member cannot', () => {
    expect(canDeleteComment(comment, AUTHOR, 'MEMBER')).toBe(true);
    expect(canDeleteComment(comment, OTHER, 'OWNER')).toBe(true);
    expect(canDeleteComment(comment, OTHER, 'MEMBER')).toBe(false);
  });
});
