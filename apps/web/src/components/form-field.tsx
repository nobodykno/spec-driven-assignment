import { type JSX, type ReactNode } from 'react';
import { Label } from './ui/label.tsx';

export interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

// NFR-USA-001: every control has a label; errors are announced and linked to the field.
export function FormField({ id, label, error, children }: FormFieldProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
