import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  membership: vi.fn(),
  destroy: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@app/database', () => ({
  Comment: { findOne: mocks.findOne, findByPk: vi.fn() },
  Project: {},
  ProjectMember: { findOne: mocks.membership },
  Task: {},
  User: {},
}));
vi.mock('./task-access.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./task-access.js')>()),
  findTaskForMember: vi.fn(),
}));

const { CommentService } = await import('./comment-service.js');

function stored(authorId: string): unknown {
  return {
    id: 'c1',
    authorId,
    task: { id: 't1', archivedAt: null, project: { id: 'p1', status: 'ACTIVE' } },
    destroy: mocks.destroy,
    update: mocks.update,
  };
}

describe('CommentService permissions', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('FR-CMT-002: another member cannot edit (403 FORBIDDEN)', async () => {
    mocks.findOne.mockResolvedValue(stored('author'));
    mocks.membership.mockResolvedValue({ role: 'OWNER' });
    await expect(new CommentService().edit('other', 'c1', 'x')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('FR-CMT-003: an Owner can delete another member comment', async () => {
    mocks.findOne.mockResolvedValue(stored('author'));
    mocks.membership.mockResolvedValue({ role: 'OWNER' });
    await new CommentService().remove('owner', 'c1');
    expect(mocks.destroy).toHaveBeenCalled();
  });

  it('FR-CMT-003: a plain member cannot delete another member comment', async () => {
    mocks.findOne.mockResolvedValue(stored('author'));
    mocks.membership.mockResolvedValue({ role: 'MEMBER' });
    await expect(new CommentService().remove('other', 'c1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it('FR-CMT-003: a non-member gets 404 NOT_FOUND', async () => {
    mocks.findOne.mockResolvedValue(stored('author'));
    mocks.membership.mockResolvedValue(null);
    await expect(new CommentService().remove('stranger', 'c1')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
