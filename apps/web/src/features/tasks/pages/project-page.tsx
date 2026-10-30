import { type PaginationMeta, type ProjectDetail, type Task } from '@app/shared';
import { type JSX } from 'react';
import { Link, useParams } from 'react-router';
import { QueryState } from '../../../components/query-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { useProjectQuery } from '../../projects/api/projects-api.ts';
import { useTasksQuery } from '../api/tasks-api.ts';
import { CreateTaskForm } from '../components/task-form.tsx';
import { TaskFilterBar } from '../components/task-filter-bar.tsx';
import { useTaskFilters } from '../lib/use-task-filters.ts';

function TaskRow({ task }: { task: Task }): JSX.Element {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <Link className="font-medium text-sky-700 underline" to={`/tasks/${task.id}`}>
          {task.title}
        </Link>
        {task.archivedAt ? <Badge className="ml-2">Archived</Badge> : null}
        <p className="text-sm text-slate-500">
          {task.assignee ? task.assignee.name : 'Unassigned'}
          {task.dueDate ? ` · due ${task.dueDate}` : ''}
        </p>
      </div>
      <div className="flex gap-2">
        <Badge>{task.priority}</Badge>
        <Badge>{task.status}</Badge>
      </div>
    </li>
  );
}

interface PaginationProps {
  meta: PaginationMeta;
  onPage: (page: number) => void;
}

function Pagination({ meta, onPage }: PaginationProps): JSX.Element {
  const lastPage = Math.max(meta.totalPages, 1);
  return (
    <nav aria-label="Pagination" className="flex items-center gap-3 text-sm">
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page <= 1}
        onClick={() => onPage(meta.page - 1)}
      >
        Previous
      </Button>
      <span>
        Page {meta.page} of {lastPage} ({meta.total} tasks)
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={meta.page >= lastPage}
        onClick={() => onPage(meta.page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

function ProjectHeader({
  projectId,
  project,
}: {
  projectId: string;
  project?: ProjectDetail;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">{project?.name ?? 'Project'}</h1>
      {project?.myRole === 'OWNER' ? (
        <Button asChild variant="outline" size="sm">
          <Link to={`/projects/${projectId}/settings`}>Settings</Link>
        </Button>
      ) : null}
    </div>
  );
}

// FR-UI-007: members of an active project can create tasks.
function NewTaskPanel({ project }: { project?: ProjectDetail }): JSX.Element | null {
  if (project?.status !== 'ACTIVE') {
    return null;
  }
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">New task</h2>
      <CreateTaskForm projectId={project.id} members={project.members} />
    </Card>
  );
}

// FR-UI-005: task list with filters, sorting and pagination, all reflected in the URL.
export function ProjectPage(): JSX.Element {
  const { projectId = '' } = useParams();
  const { filters, setFilters } = useTaskFilters();
  const project = useProjectQuery(projectId);
  const tasks = useTasksQuery(projectId, filters);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <ProjectHeader projectId={projectId} project={project.data} />
      <NewTaskPanel project={project.data} />
      <TaskFilterBar filters={filters} onChange={setFilters} />
      <QueryState
        isLoading={tasks.isPending}
        error={tasks.error}
        isEmpty={tasks.data?.items.length === 0}
        emptyMessage="No tasks match these filters."
        onRetry={() => void tasks.refetch()}
      >
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-4">
          {tasks.data?.items.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      </QueryState>
      {tasks.data ? (
        <Pagination meta={tasks.data.meta} onPage={(page) => setFilters({ page: String(page) })} />
      ) : null}
    </div>
  );
}
