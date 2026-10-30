import type { z } from 'zod';
import { AppError, type ErrorDetail } from './errors.js';

function toDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

// NFR-SEC-003 / SDS §6.1: parse external input or throw 400 VALIDATION_ERROR with field details.
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 400, 'Validation failed', toDetails(result.error));
  }
  return result.data;
}
