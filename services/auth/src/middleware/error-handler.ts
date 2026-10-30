import { AppError } from '@app/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', 404, `Route ${req.method} ${req.path} not found`));
};

// SDS §10: AppError maps to its status; anything else becomes 500 without details.
// Unknown errors are logged server-side (console until the logger arrives in DEV-1006).
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json(err.toResponse());
    return;
  }
  console.error('Unhandled error', err);
  const error = new AppError('INTERNAL_ERROR', 500, 'Internal server error');
  res.status(error.status).json(error.toResponse());
};
