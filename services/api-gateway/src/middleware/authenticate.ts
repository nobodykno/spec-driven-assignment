import { AccessTokenClaimsSchema, AppError } from '@app/shared';
import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

// SDS §2.2: public routes need no token.
const PUBLIC_ROUTES = new Set([
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'POST /api/v1/auth/refresh',
  'GET /api/v1/auth/health',
]);

const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-internal-token'];
const UNAUTHORIZED = (): AppError => new AppError('UNAUTHORIZED', 401, 'Authentication required');

function bearerToken(header: string | undefined): string | undefined {
  const [scheme, token] = header?.split(' ') ?? [];
  return scheme === 'Bearer' && token ? token : undefined;
}

export interface AuthenticateOptions {
  jwtSecret: string;
  internalToken: string;
}

// FR-AUTH-005: verify the access token, drop any client-supplied identity headers, then forward
// the verified identity together with the internal token (SDS §2.2 steps 2-3).
export function authenticate(options: AuthenticateOptions): RequestHandler {
  return (req, _res, next) => {
    IDENTITY_HEADERS.forEach((name) => Reflect.deleteProperty(req.headers, name));
    if (PUBLIC_ROUTES.has(`${req.method} ${req.originalUrl.split('?')[0]}`)) {
      next();
      return;
    }
    const token = bearerToken(req.headers.authorization);
    try {
      const payload = jwt.verify(token ?? '', options.jwtSecret, { algorithms: ['HS256'] });
      const claims = AccessTokenClaimsSchema.parse(payload);
      req.headers['x-user-id'] = claims.sub;
      req.headers['x-user-role'] = claims.role;
      req.headers['x-internal-token'] = options.internalToken;
      next();
    } catch {
      // Any verification failure is the same 401; the reason is never revealed.
      next(UNAUTHORIZED());
    }
  };
}
