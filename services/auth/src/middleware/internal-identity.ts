import { timingSafeEqual } from 'node:crypto';
import { AppError, SystemRoleSchema, type SystemRole } from '@app/shared';
import type { RequestHandler, Response } from 'express';

export interface Identity {
  userId: string;
  role: SystemRole;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function readIdentity(res: Response): Identity {
  return res.locals.identity as Identity;
}

// SDS §2.2 step 4 / §7.3: only the gateway can vouch for an identity.
export function requireInternalIdentity(internalToken: string): RequestHandler {
  return (req, res, next) => {
    const token = req.headers['x-internal-token'];
    const userId = req.headers['x-user-id'];
    const role = SystemRoleSchema.safeParse(req.headers['x-user-role']);
    const trusted = typeof token === 'string' && safeEqual(token, internalToken);
    if (!trusted || typeof userId !== 'string' || !userId || !role.success) {
      next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
      return;
    }
    res.locals.identity = { userId, role: role.data } satisfies Identity;
    next();
  };
}
