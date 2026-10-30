import { type JSX, type ReactNode } from 'react';
import { Button } from './ui/button.tsx';

export interface QueryStateProps {
  isLoading: boolean;
  error: Error | null;
  isEmpty: boolean;
  emptyMessage: string;
  onRetry: () => void;
  children: ReactNode;
}

// FR-UI-010: every data view shows loading, empty and error states. Loading uses aria-live,
// not role="status", which is reserved for the API status indicator (FR-SYS-002).
export function QueryState({
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  children,
}: QueryStateProps): JSX.Element {
  if (isLoading) {
    return (
      <p aria-live="polite" className="text-sm text-slate-500">
        Loading…
      </p>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm text-red-700">
        <span>{error.message}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }
  return <>{children}</>;
}
