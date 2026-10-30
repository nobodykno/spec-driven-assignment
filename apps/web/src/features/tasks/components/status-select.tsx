import { ALLOWED_TRANSITIONS, type TaskStatus } from '@app/shared';
import { type JSX } from 'react';
import { FormField } from '../../../components/form-field.tsx';

// FR-TASK-005 / FR-UI-007: the current status plus only the transitions the API will accept.
export function allowedStatusOptions(current: TaskStatus): TaskStatus[] {
  return [current, ...ALLOWED_TRANSITIONS[current]];
}

interface StatusSelectProps {
  current: TaskStatus;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
}

export function StatusSelect({ current, disabled, onChange }: StatusSelectProps): JSX.Element {
  return (
    <FormField id="task-status" label="Status">
      <select
        id="task-status"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        value={current}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as TaskStatus)}
      >
        {allowedStatusOptions(current).map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </FormField>
  );
}
