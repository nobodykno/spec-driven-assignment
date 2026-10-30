import { AppError, UuidSchema } from '@app/shared';
import type { Request } from 'express';

// SDS §6.1: path ids are validated like any other input; a malformed id is a 400.
export function uuidParam(req: Request, name: string): string {
  const result = UuidSchema.safeParse(req.params[name]);
  if (!result.success) {
    throw new AppError('VALIDATION_ERROR', 400, 'Validation failed', [
      { path: name, message: 'Must be a valid UUID' },
    ]);
  }
  return result.data;
}
