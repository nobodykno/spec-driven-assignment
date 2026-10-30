import { TaskPrioritySchema, TaskStatusSchema } from '@app/shared';
import { type JSX } from 'react';
import { FormField } from '../../../components/form-field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { type FilterPatch, type TaskFilters } from '../lib/task-filters.ts';

const SELECT_CLASS = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

interface CheckboxGroupProps {
  legend: string;
  options: readonly string[];
  selected: readonly string[];
  onChange: (next: string[]) => void;
}

function CheckboxGroup({ legend, options, selected, onChange }: CheckboxGroupProps): JSX.Element {
  const toggle = (option: string): string[] =>
    selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
  return (
    <fieldset className="flex flex-wrap items-center gap-3">
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      {options.map((option) => (
        <label key={option} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onChange(toggle(option))}
          />
          {option}
        </label>
      ))}
    </fieldset>
  );
}

interface TaskFilterBarProps {
  filters: TaskFilters;
  onChange: (patch: FilterPatch) => void;
}

// FR-UI-005: every control writes to the URL through `onChange`.
export function TaskFilterBar({ filters, onChange }: TaskFilterBarProps): JSX.Element {
  return (
    <form
      aria-label="Task filters"
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <CheckboxGroup
        legend="Status"
        options={TaskStatusSchema.options}
        selected={filters.status ?? []}
        onChange={(next) => onChange({ status: next.join(',') })}
      />
      <CheckboxGroup
        legend="Priority"
        options={TaskPrioritySchema.options}
        selected={filters.priority ?? []}
        onChange={(next) => onChange({ priority: next.join(',') })}
      />
      <div className="flex flex-wrap items-end gap-4">
        <FormField id="filter-assignee" label="Assignee">
          <select
            id="filter-assignee"
            className={SELECT_CLASS}
            value={filters.assigneeId ?? ''}
            onChange={(event) => onChange({ assigneeId: event.target.value })}
          >
            <option value="">Anyone</option>
            <option value="me">Assigned to me</option>
            <option value="none">Unassigned</option>
          </select>
        </FormField>
        <FormField id="filter-due-from" label="Due from">
          <Input
            id="filter-due-from"
            type="date"
            value={filters.dueFrom ?? ''}
            onChange={(event) => onChange({ dueFrom: event.target.value })}
          />
        </FormField>
        <FormField id="filter-due-to" label="Due to">
          <Input
            id="filter-due-to"
            type="date"
            value={filters.dueTo ?? ''}
            onChange={(event) => onChange({ dueTo: event.target.value })}
          />
        </FormField>
        <FormField id="filter-sort" label="Sort by">
          <select
            id="filter-sort"
            className={SELECT_CLASS}
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value })}
          >
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            <option value="dueDate">Due date</option>
            <option value="priority">Priority</option>
          </select>
        </FormField>
        <FormField id="filter-order" label="Order">
          <select
            id="filter-order"
            className={SELECT_CLASS}
            value={filters.order}
            onChange={(event) => onChange({ order: event.target.value })}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.includeArchived}
            onChange={(event) => onChange({ includeArchived: event.target.checked ? 'true' : '' })}
          />
          Show archived
        </label>
      </div>
    </form>
  );
}
