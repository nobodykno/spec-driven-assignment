import { type Task } from '@app/shared';
import { type JSX } from 'react';
import { Link, useParams } from 'react-router';
import { QueryState } from '../../../components/query-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { ApiError } from '../../../lib/api-client.ts';
import { useTaskQuery } from '../api/tasks-api.ts';

function Field({
  label,
  children,
}: {
  label: string;
  children: string | JSX.Element;
}): JSX.Element {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TaskFields({ task }: { task: Task }): JSX.Element {
  return (
    <Card>
      <h1 className="mb-4 text-2xl font-semibold">{task.title}</h1>
      <dl className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <Badge>{task.status}</Badge>
        </Field>
        <Field label="Priority">
          <Badge>{task.priority}</Badge>
        </Field>
        <Field label="Due date">{task.dueDate ?? 'No due date'}</Field>
        <Field label="Assignee">{task.assignee?.name ?? 'Unassigned'}</Field>
        <Field label="Created by">{task.createdBy.name}</Field>
        <Field label="Created">{new Date(task.createdAt).toLocaleString()}</Field>
        <Field label="Updated">{new Date(task.updatedAt).toLocaleString()}</Field>
        <Field label="Archived">
          {task.archivedAt ? new Date(task.archivedAt).toLocaleString() : 'No'}
        </Field>
      </dl>
      <h2 className="mb-1 mt-4 text-sm text-slate-500">Description</h2>
      <p className="whitespace-pre-wrap">{task.description || 'No description'}</p>
    </Card>
  );
}

// FR-UI-006: task detail page with all fields. Comments and activity (DEV-16) render below.
export function TaskDetailPage(): JSX.Element {
  const { taskId = '' } = useParams();
  const query = useTaskQuery(taskId);
  const notFound = query.error instanceof ApiError && query.error.status === 404;
  const task = query.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Link
        className="text-sm text-sky-700 underline"
        to={task ? `/projects/${task.projectId}` : '/projects'}
      >
        Back to project
      </Link>
      {notFound ? (
        <p role="alert">Task not found.</p>
      ) : (
        <QueryState
          isLoading={query.isPending}
          error={query.error}
          isEmpty={!task}
          emptyMessage="Task not found."
          onRetry={() => void query.refetch()}
        >
          {task ? <TaskFields task={task} /> : null}
        </QueryState>
      )}
      <div data-slot="task-extras" />
    </div>
  );
}
