import { type Task } from '@app/shared';
import { type JSX } from 'react';
import { Link, useParams } from 'react-router';
import { QueryState } from '../../../components/query-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { ApiError } from '../../../lib/api-client.ts';
import { useAuthState } from '../../../lib/auth-store.ts';
import { ActivityTimeline } from '../../activity/components/activity-timeline.tsx';
import { CommentsSection } from '../../comments/components/comments-section.tsx';
import { useProjectQuery } from '../../projects/api/projects-api.ts';
import { useTaskQuery } from '../api/tasks-api.ts';
import { TaskActions } from '../components/task-actions.tsx';

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

// Actions, comments and activity need the project (members, caller role) and the signed-in user.
function TaskExtras({ task }: { task: Task }): JSX.Element | null {
  const auth = useAuthState();
  const project = useProjectQuery(task.projectId);
  if (auth.status !== 'authenticated' || !project.data) {
    return null;
  }
  const readOnly = task.archivedAt !== null || project.data.status === 'ARCHIVED';
  return (
    <>
      <TaskActions task={task} project={project.data} />
      <CommentsSection
        taskId={task.id}
        userId={auth.user.id}
        role={project.data.myRole}
        readOnly={readOnly}
      />
      <ActivityTimeline taskId={task.id} />
    </>
  );
}

// FR-UI-006: task detail page with all fields. FR-UI-007..009: actions, comments and activity.
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
      {task ? <TaskExtras task={task} /> : null}
    </div>
  );
}
