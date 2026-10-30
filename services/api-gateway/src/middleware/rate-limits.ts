import { AppError } from '@app/shared';
import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;
const MAX_REGISTRATIONS = 20;

const rejectRateLimited: RequestHandler = (_req, _res, next) => {
  next(new AppError('RATE_LIMITED', 429, 'Too many attempts, try again later'));
};

// FR-AUTH-002: more than 10 failed attempts per IP in 15 minutes. Successful logins are not counted.
export function loginRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit: MAX_FAILED_LOGINS,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rejectRateLimited,
  });
}

// SDS §7.4: limit account creation per IP.
export function registerRateLimit(): RequestHandler {
  return rateLimit({
    windowMs: ONE_HOUR_MS,
    limit: MAX_REGISTRATIONS,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rejectRateLimited,
  });
}
