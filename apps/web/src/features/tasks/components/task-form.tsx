import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateTaskSchema,
  TaskPrioritySchema,
  UpdateTaskSchema,
  type CreateTaskInput,
  type ProjectMember,
  type Task,
  type TaskPriority,
  type UpdateTaskInput,
} from '@app/shared';
import { type JSX } from 'react';
import { useForm, type FieldErrors, type Resolver, type UseFormRegister } from 'react-hook-form';
import { FormField } from '../../../components/form-field.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { applyApiError } from '../../../lib/form-errors.ts';
import { useCreateTaskMutation, useUpdateTaskMutation } from '../api/task-mutations.ts';

// Empty inputs become null/undefined so they satisfy the nullish contract fields.
interface TaskFormValues {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
}

const SELECT_CLASS = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const emptyToNull = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

interface FieldsProps {
  register: UseFormRegister<TaskFormValues>;
  errors: FieldErrors<TaskFormValues>;
  members?: ProjectMember[];
}

function TaskFields({ register, errors, members }: FieldsProps): JSX.Element {
  return (
    <>
      <FormField id="task-title" label="Title" error={errors.title?.message}>
        <Input id="task-title" {...register('title')} />
      </FormField>
      <FormField id="task-description" label="Description" error={errors.description?.message}>
        <Input id="task-description" {...register('description', { setValueAs: emptyToNull })} />
      </FormField>
      <FormField id="task-priority" label="Priority" error={errors.priority?.message}>
        <select id="task-priority" className={SELECT_CLASS} {...register('priority')}>
          {TaskPrioritySchema.options.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </FormField>
      <FormField id="task-due" label="Due date" error={errors.dueDate?.message}>
        <Input id="task-due" type="date" {...register('dueDate', { setValueAs: emptyToNull })} />
      </FormField>
      {members ? (
        <FormField id="task-assignee" label="Assignee" error={errors.assigneeId?.message}>
          <select
            id="task-assignee"
            className={SELECT_CLASS}
            {...register('assigneeId', { setValueAs: emptyToNull })}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}
    </>
  );
}

interface CreateTaskFormProps {
  projectId: string;
  members: ProjectMember[];
}

// FR-UI-007: create form.
export function CreateTaskForm({ projectId, members }: CreateTaskFormProps): JSX.Element {
  const create = useCreateTaskMutation(projectId);
  const form = useForm<TaskFormValues, unknown, CreateTaskInput>({
    resolver: zodResolver(CreateTaskSchema),
    defaultValues: { title: '', priority: 'MEDIUM' },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      form.reset({ title: '', priority: 'MEDIUM' });
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });
  const { errors } = form.formState;
  return (
    <form aria-label="Create task" onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <TaskFields register={form.register} errors={errors} members={members} />
      {errors.root ? (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={create.isPending}>
        Create task
      </Button>
    </form>
  );
}

// FR-UI-007: edit form (title, description, priority, due date).
export function EditTaskForm({ task }: { task: Task }): JSX.Element {
  const update = useUpdateTaskMutation(task.id);
  const form = useForm<TaskFormValues, unknown, UpdateTaskInput>({
    // The edit schema has no assigneeId (assignment is a separate action), so the resolver is
    // widened to the shared form value type used by the field inputs.
    resolver: zodResolver(UpdateTaskSchema) as unknown as Resolver<
      TaskFormValues,
      unknown,
      UpdateTaskInput
    >,
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ?? '',
    },
  });
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });
  const { errors } = form.formState;
  return (
    <form aria-label="Edit task" onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <TaskFields register={form.register} errors={errors} />
      {errors.root ? (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={update.isPending}>
        Save task
      </Button>
    </form>
  );
}
