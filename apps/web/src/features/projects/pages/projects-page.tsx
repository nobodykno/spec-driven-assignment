import { zodResolver } from '@hookform/resolvers/zod';
import { CreateProjectSchema, type CreateProjectInput, type ProjectListItem } from '@app/shared';
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FormField } from '../../../components/form-field.tsx';
import { QueryState } from '../../../components/query-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { applyApiError } from '../../../lib/form-errors.ts';
import {
  useArchiveProjectMutation,
  useCreateProjectMutation,
  useProjectsQuery,
} from '../api/projects-api.ts';

function CreateProjectForm(): JSX.Element {
  const create = useCreateProjectMutation();
  const form = useForm<CreateProjectInput>({ resolver: zodResolver(CreateProjectSchema) });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">New project</h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <FormField id="project-name" label="Name" error={errors.name?.message}>
          <Input id="project-name" {...form.register('name')} />
        </FormField>
        <FormField id="project-description" label="Description" error={errors.description?.message}>
          <Input id="project-description" {...form.register('description')} />
        </FormField>
        {errors.root ? (
          <p role="alert" className="text-sm text-red-700">
            {errors.root.message}
          </p>
        ) : null}
        <Button type="submit" disabled={create.isPending}>
          Create project
        </Button>
      </form>
    </Card>
  );
}

function ProjectRow({ project }: { project: ProjectListItem }): JSX.Element {
  const archive = useArchiveProjectMutation();
  const isOwner = project.myRole === 'OWNER';
  const archived = project.status === 'ARCHIVED';
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <Link className="font-medium text-sky-700 underline" to={`/projects/${project.id}`}>
          {project.name}
        </Link>
        {archived ? <Badge className="ml-2">Archived</Badge> : null}
        {project.description ? (
          <p className="text-sm text-slate-500">{project.description}</p>
        ) : null}
        {archive.error ? (
          <p role="alert" className="text-sm text-red-700">
            {archive.error.message}
          </p>
        ) : null}
      </div>
      {isOwner && !archived ? (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/projects/${project.id}/settings`}>Settings</Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={archive.isPending}
            onClick={() => archive.mutate(project.id)}
          >
            Archive
          </Button>
        </div>
      ) : null}
    </li>
  );
}

// FR-UI-003: list, create, edit (settings page) and archive projects.
export function ProjectsPage(): JSX.Element {
  const [includeArchived, setIncludeArchived] = useState(false);
  const projects = useProjectsQuery(includeArchived);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <CreateProjectForm />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) => setIncludeArchived(event.target.checked)}
        />
        Show archived projects
      </label>
      <QueryState
        isLoading={projects.isPending}
        error={projects.error}
        isEmpty={projects.data?.length === 0}
        emptyMessage="You are not a member of any project yet. Create one above."
        onRetry={() => void projects.refetch()}
      >
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white px-4">
          {projects.data?.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </ul>
      </QueryState>
    </div>
  );
}
