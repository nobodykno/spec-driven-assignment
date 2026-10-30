import { zodResolver } from '@hookform/resolvers/zod';
import {
  AddMemberSchema,
  UpdateProjectSchema,
  type AddMemberInput,
  type ProjectDetail,
  type ProjectRole,
  type UpdateProjectInput,
} from '@app/shared';
import { type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useParams } from 'react-router';
import { FormField } from '../../../components/form-field.tsx';
import { QueryState } from '../../../components/query-state.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { applyApiError } from '../../../lib/form-errors.ts';
import {
  useAddMemberMutation,
  useProjectQuery,
  useRemoveMemberMutation,
  useUpdateProjectMutation,
} from '../api/projects-api.ts';

function EditProjectForm({ project }: { project: ProjectDetail }): JSX.Element {
  const update = useUpdateProjectMutation(project.id);
  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(UpdateProjectSchema),
    defaultValues: { name: project.name, description: project.description ?? '' },
  });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Project details</h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <FormField id="edit-name" label="Name" error={errors.name?.message}>
          <Input id="edit-name" {...form.register('name')} />
        </FormField>
        <FormField id="edit-description" label="Description" error={errors.description?.message}>
          <Input id="edit-description" {...form.register('description')} />
        </FormField>
        {errors.root ? (
          <p role="alert" className="text-sm text-red-700">
            {errors.root.message}
          </p>
        ) : null}
        <Button type="submit" disabled={update.isPending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}

// The schema defaults `role`, so the form input has it optional and the output required.
interface AddMemberFormValues {
  email: string;
  role?: ProjectRole;
}

function AddMemberForm({ projectId }: { projectId: string }): JSX.Element {
  const add = useAddMemberMutation(projectId);
  const form = useForm<AddMemberFormValues, unknown, AddMemberInput>({
    resolver: zodResolver(AddMemberSchema),
    defaultValues: { role: 'MEMBER' },
  });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync(values);
      form.reset({ email: '', role: 'MEMBER' });
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <FormField id="member-email" label="Member email" error={errors.email?.message}>
        <Input id="member-email" type="email" {...form.register('email')} />
      </FormField>
      <FormField id="member-role" label="Role">
        <select
          id="member-role"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          {...form.register('role')}
        >
          <option value="MEMBER">Member</option>
          <option value="OWNER">Owner</option>
        </select>
      </FormField>
      {errors.root ? (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={add.isPending}>
        Add member
      </Button>
    </form>
  );
}

function MembersCard({ project }: { project: ProjectDetail }): JSX.Element {
  const remove = useRemoveMemberMutation(project.id);
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Members</h2>
      <ul className="mb-4 divide-y divide-slate-200">
        {project.members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between py-2">
            <span>
              {member.name} <span className="text-sm text-slate-500">{member.email}</span>{' '}
              <Badge>{member.role}</Badge>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(member.userId)}
            >
              Remove {member.name}
            </Button>
          </li>
        ))}
      </ul>
      {remove.error ? (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {remove.error.message}
        </p>
      ) : null}
      <AddMemberForm projectId={project.id} />
    </Card>
  );
}

// FR-UI-003 / FR-UI-004: Owner-only. Members are redirected to the project page.
export function ProjectSettingsPage(): JSX.Element {
  const { projectId = '' } = useParams();
  const query = useProjectQuery(projectId);
  const project = query.data;
  if (project && project.myRole !== 'OWNER') {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Link className="text-sm text-sky-700 underline" to="/projects">
        Back to projects
      </Link>
      <h1 className="text-2xl font-semibold">Project settings</h1>
      <QueryState
        isLoading={query.isPending}
        error={query.error}
        isEmpty={!project}
        emptyMessage="Project not found."
        onRetry={() => void query.refetch()}
      >
        {project ? (
          <>
            <EditProjectForm project={project} />
            <MembersCard project={project} />
          </>
        ) : null}
      </QueryState>
    </div>
  );
}
