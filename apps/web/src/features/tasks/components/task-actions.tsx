import { type ProjectDetail, type Task } from '@app/shared';
import { useState, type JSX } from 'react';
import { FormField } from '../../../components/form-field.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import {
  useArchiveTaskMutation,
  useAssignTaskMutation,
  useChangeStatusMutation,
} from '../api/task-mutations.ts';
import { EditTaskForm } from './task-form.tsx';
import { StatusSelect } from './status-select.tsx';

export function isReadOnly(task: Task, project: ProjectDetail): boolean {
  return task.archivedAt !== null || project.status === 'ARCHIVED';
}

function firstError(...errors: Array<Error | null>): string | null {
  return errors.find((error) => error !== null)?.message ?? null;
}

function ReadOnlyNotice({ readOnly }: { readOnly: boolean }): JSX.Element | null {
  return readOnly ? <p className="text-sm text-slate-500">This task is read-only.</p> : null;
}

interface AssigneeSelectProps {
  current: string;
  members: ProjectDetail['members'];
  disabled: boolean;
  onChange: (assigneeId: string | null) => void;
}

function AssigneeSelect({
  current,
  members,
  disabled,
  onChange,
}: AssigneeSelectProps): JSX.Element {
  return (
    <FormField id="task-assign" label="Assignee">
      <select
        id="task-assign"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        value={current}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>
    </FormField>
  );
}

interface OwnerButtonsProps {
  editing: boolean;
  archiving: boolean;
  onToggleEdit: () => void;
  onArchive: () => void;
}

function TaskButtons({
  editing,
  archiving,
  onToggleEdit,
  onArchive,
}: OwnerButtonsProps): JSX.Element {
  return (
    <>
      <Button variant="outline" onClick={onToggleEdit}>
        {editing ? 'Cancel editing' : 'Edit task'}
      </Button>
      <Button variant="destructive" disabled={archiving} onClick={onArchive}>
        Archive task
      </Button>
    </>
  );
}

interface TaskActionsProps {
  task: Task;
  project: ProjectDetail;
}

// FR-UI-007: status (allowed transitions only), assignee, edit and archive. Archived tasks and
// archived projects are read-only.
export function TaskActions({ task, project }: TaskActionsProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const status = useChangeStatusMutation(task.id);
  const assign = useAssignTaskMutation(task.id);
  const archive = useArchiveTaskMutation(task.id);
  const readOnly = isReadOnly(task, project);
  const error = firstError(status.error, assign.error, archive.error);

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Manage task</h2>
      <ReadOnlyNotice readOnly={readOnly} />
      <div className="flex flex-wrap items-end gap-4">
        <StatusSelect
          current={task.status}
          disabled={readOnly || status.isPending}
          onChange={(next) => status.mutate(next)}
        />
        <AssigneeSelect
          current={task.assignee?.id ?? ''}
          members={project.members}
          disabled={readOnly || assign.isPending}
          onChange={(assigneeId) => assign.mutate({ assigneeId })}
        />
        {readOnly ? null : (
          <TaskButtons
            editing={editing}
            archiving={archive.isPending}
            onToggleEdit={() => setEditing((value) => !value)}
            onArchive={() => archive.mutate()}
          />
        )}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {editing && !readOnly ? <EditTaskForm task={task} /> : null}
    </Card>
  );
}
