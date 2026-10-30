import { AppError } from '@app/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from 'pino';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', 404, `Route ${req.method} ${req.path} not found`));
};

// SDS §10: AppError maps to its status; anything else becomes 500 without details and is
// logged server-side.
export function errorHandler(logger: Pick<Logger, 'error'>): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json(err.toResponse());
      return;
    }
    logger.error({ err }, 'Unhandled error');
    const error = new AppError('INTERNAL_ERROR', 500, 'Internal server error');
    res.status(error.status).json(error.toResponse());
  };
}
