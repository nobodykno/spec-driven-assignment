import { createHash, randomBytes } from 'node:crypto';
import { ACCESS_TOKEN_TTL_SECONDS, type SystemRole } from '@app/shared';
import jwt from 'jsonwebtoken';

// SDS §7.2: HS256 access token with sub, role, iat, exp.
export function signAccessToken(user: { id: string; role: SystemRole }, secret: string): string {
  return jwt.sign({ role: user.role }, secret, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
}

// SDS §7.2: only the SHA-256 of the refresh token is stored.
export function hashRefreshToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// 256-bit random refresh token.
export function generateRefreshToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('base64url');
  return { raw, hash: hashRefreshToken(raw) };
}
