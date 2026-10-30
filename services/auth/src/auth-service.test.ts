import { beforeEach, describe, expect, it, vi } from 'vitest';

interface TokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  update: (values: Partial<TokenRow>) => Promise<void>;
}

const store = vi.hoisted(() => ({ tokens: [] as unknown[] }));

vi.mock('@app/database', () => {
  const user = { id: 'u1', name: 'Ada', email: 'a@x.io', role: 'USER', passwordHash: 'h' };
  const rows = (): TokenRow[] => store.tokens as TokenRow[];
  return {
    User: { findByPk: vi.fn(async () => user), findOne: vi.fn(async () => user) },
    RefreshToken: {
      create: vi.fn(async (values: Omit<TokenRow, 'id' | 'update'>) => {
        const row: TokenRow = {
          ...values,
          id: `t${rows().length + 1}`,
          revokedAt: null,
          replacedById: null,
          update: async (changes) => {
            Object.assign(row, changes);
          },
        };
        rows().push(row);
        return row;
      }),
      findOne: vi.fn(
        async ({ where }: { where: { tokenHash: string } }) =>
          rows().find((row) => row.tokenHash === where.tokenHash) ?? null,
      ),
      update: vi.fn(
        async (
          changes: Partial<TokenRow>,
          { where }: { where: { familyId?: string; tokenHash?: string } },
        ) => {
          rows()
            .filter((row) => !row.revokedAt)
            .filter((row) => !where.familyId || row.familyId === where.familyId)
            .filter((row) => !where.tokenHash || row.tokenHash === where.tokenHash)
            .forEach((row) => Object.assign(row, changes));
        },
      ),
    },
    getSequelize: () => ({
      transaction: async (work: (tx: unknown) => Promise<unknown>) =>
        work({ LOCK: { UPDATE: 'UPDATE' } }),
    }),
  };
});

const { AuthService } = await import('./services/auth-service.js');

const config = { jwtSecret: 'secret', internalToken: 'i', secureCookies: false };
const credentials = { email: 'a@x.io', password: 'x' };

async function loginWithKnownPassword(): Promise<{ refreshToken: string }> {
  const bcrypt = (await import('bcryptjs')).default;
  const { User } = await import('@app/database');
  const hash = await bcrypt.hash('abcdefg1', 4);
  vi.mocked(User.findOne).mockResolvedValue({
    id: 'u1',
    name: 'Ada',
    email: 'a@x.io',
    role: 'USER',
    passwordHash: hash,
  } as never);
  return new AuthService(config).login({ ...credentials, password: 'abcdefg1' });
}

describe('AuthService', () => {
  beforeEach(() => {
    store.tokens.length = 0;
  });

  it('FR-AUTH-002: wrong password gives INVALID_CREDENTIALS', async () => {
    await expect(new AuthService(config).login(credentials)).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('FR-AUTH-003: refresh rotates the token and revokes the old one', async () => {
    const { refreshToken } = await loginWithKnownPassword();
    const service = new AuthService(config);
    const next = await service.refresh(refreshToken);
    expect(next.refreshToken).not.toBe(refreshToken);
    expect((store.tokens as TokenRow[])[0]?.revokedAt).not.toBeNull();
  });

  it('FR-AUTH-003: reusing a rotated token revokes the whole family', async () => {
    const { refreshToken } = await loginWithKnownPassword();
    const service = new AuthService(config);
    await service.refresh(refreshToken);
    await expect(service.refresh(refreshToken)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    expect((store.tokens as TokenRow[]).every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('FR-AUTH-003: an unknown or missing token is rejected', async () => {
    const service = new AuthService(config);
    await expect(service.refresh('nope')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN' });
    await expect(service.refresh(undefined)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('FR-AUTH-004: a logged-out token cannot be refreshed', async () => {
    const { refreshToken } = await loginWithKnownPassword();
    const service = new AuthService(config);
    await service.logout('u1', refreshToken);
    await expect(service.refresh(refreshToken)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
  });
});
