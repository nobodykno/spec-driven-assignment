import { randomUUID } from 'node:crypto';
import {
  RefreshToken,
  UniqueConstraintError,
  User,
  getSequelize,
  type Transaction,
} from '@app/database';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AppError,
  REFRESH_TOKEN_TTL_SECONDS,
  type LoginInput,
  type RegisterInput,
  type TokenResponse,
  type User as UserDto,
} from '@app/shared';
import bcrypt from 'bcryptjs';
import type { AuthConfig } from '../config.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './token-service.js';

// SDS §7.1: cost 12; compared against when the email is unknown so timing does not leak accounts.
const BCRYPT_COST = 12;
const DUMMY_HASH = '$2b$12$La4UGCiCbeHiEgZXQcVese48wLda02YROhuc8e65yY2j.z.8CvgEW';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

export interface IssuedSession {
  tokens: TokenResponse;
  refreshToken: string;
}

export interface LoginResult extends IssuedSession {
  user: UserDto;
}

type RotateOutcome = { kind: 'invalid' | 'reuse' } | { kind: 'rotated'; session: IssuedSession };

export function toUserDto(user: User): UserDto {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function invalidRefreshToken(): AppError {
  return new AppError('INVALID_REFRESH_TOKEN', 401, 'Invalid refresh token');
}

export class AuthService {
  constructor(private readonly config: AuthConfig) {}

  // FR-AUTH-001
  async register(input: RegisterInput): Promise<UserDto> {
    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) {
      throw new AppError('EMAIL_TAKEN', 409, 'Email is already registered');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    try {
      const user = await User.create({ name: input.name, email: input.email, passwordHash });
      return toUserDto(user);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AppError('EMAIL_TAKEN', 409, 'Email is already registered');
      }
      throw error;
    }
  }

  // FR-AUTH-002
  async login(input: LoginInput): Promise<LoginResult> {
    const user = await User.findOne({ where: { email: input.email } });
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) {
      throw new AppError('INVALID_CREDENTIALS', 401, INVALID_CREDENTIALS_MESSAGE);
    }
    const session = await this.issueSession(user, randomUUID());
    return { ...session, user: toUserDto(user) };
  }

  // FR-AUTH-003: rotation and reuse detection.
  async refresh(rawToken: string | undefined): Promise<IssuedSession> {
    if (!rawToken) {
      throw invalidRefreshToken();
    }
    // The outcome is returned (not thrown) so a family revocation is committed, not rolled back.
    const outcome = await getSequelize().transaction((tx) => this.rotate(rawToken, tx));
    if (outcome.kind !== 'rotated') {
      throw invalidRefreshToken();
    }
    return outcome.session;
  }

  // FR-AUTH-004
  async logout(userId: string, rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    await RefreshToken.update(
      { revokedAt: new Date() },
      { where: { tokenHash: hashRefreshToken(rawToken), userId, revokedAt: null } },
    );
  }

  // FR-AUTH-007
  async me(userId: string): Promise<UserDto> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
    }
    return toUserDto(user);
  }

  private async rotate(rawToken: string, tx: Transaction): Promise<RotateOutcome> {
    const stored = await RefreshToken.findOne({
      where: { tokenHash: hashRefreshToken(rawToken) },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!stored) {
      return { kind: 'invalid' };
    }
    if (stored.revokedAt) {
      await RefreshToken.update(
        { revokedAt: new Date() },
        { where: { familyId: stored.familyId, revokedAt: null }, transaction: tx },
      );
      return { kind: 'reuse' };
    }
    const user = await User.findByPk(stored.userId, { transaction: tx });
    if (stored.expiresAt.getTime() <= Date.now() || !user) {
      return { kind: 'invalid' };
    }
    const session = await this.issueSession(user, stored.familyId, tx, stored);
    return { kind: 'rotated', session };
  }

  private async issueSession(
    user: User,
    familyId: string,
    tx?: Transaction,
    previous?: RefreshToken,
  ): Promise<IssuedSession> {
    const refresh = generateRefreshToken();
    const created = await RefreshToken.create(
      {
        userId: user.id,
        tokenHash: refresh.hash,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
      { transaction: tx },
    );
    if (previous) {
      await previous.update(
        { revokedAt: new Date(), replacedById: created.id },
        { transaction: tx },
      );
    }
    return {
      refreshToken: refresh.raw,
      tokens: {
        accessToken: signAccessToken(user, this.config.jwtSecret),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
    };
  }
}
