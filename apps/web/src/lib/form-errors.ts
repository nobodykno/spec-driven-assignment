import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api-client.ts';

// FR-UI-001: map a server error onto the form: field details inline, anything else on the form.
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): void {
  if (!(error instanceof ApiError)) {
    setError('root', { message: 'Something went wrong. Please try again.' });
    return;
  }
  const fieldErrors = error.details.filter((detail) => detail.path !== '');
  fieldErrors.forEach((detail) => {
    setError(detail.path as Path<T>, { message: detail.message });
  });
  if (fieldErrors.length === 0) {
    setError('root', { message: error.message });
  }
}
