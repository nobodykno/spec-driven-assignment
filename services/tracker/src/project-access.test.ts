import { describe, expect, it, vi } from 'vitest';

const findOne = vi.hoisted(() => vi.fn());

vi.mock('@app/database', () => ({ Project: {}, ProjectMember: { findOne } }));

const { assertProjectActive, requireProjectRole } = await import('./services/project-access.js');

describe('requireProjectRole', () => {
  it('FR-AUTH-006: a non-member gets 404 NOT_FOUND', async () => {
    findOne.mockResolvedValue(null);
    await expect(requireProjectRole('p', 'u', ['OWNER'])).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('FR-AUTH-006: a member on an owner-only action gets 403 FORBIDDEN', async () => {
    findOne.mockResolvedValue({ role: 'MEMBER', project: { id: 'p' } });
    await expect(requireProjectRole('p', 'u', ['OWNER'])).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });

  it('FR-AUTH-006: an owner is allowed and receives the project', async () => {
    findOne.mockResolvedValue({ role: 'OWNER', project: { id: 'p' } });
    await expect(requireProjectRole('p', 'u', ['OWNER'])).resolves.toEqual({
      project: { id: 'p' },
      role: 'OWNER',
    });
  });
});

describe('assertProjectActive', () => {
  it('FR-PROJ-004: an archived project is rejected with 409 PROJECT_ARCHIVED', () => {
    expect(() => assertProjectActive({ status: 'ARCHIVED' })).toThrowError(
      expect.objectContaining({ status: 409, code: 'PROJECT_ARCHIVED' }),
    );
  });

  it('FR-PROJ-003: an active project passes', () => {
    expect(() => assertProjectActive({ status: 'ACTIVE' })).not.toThrow();
  });
});
