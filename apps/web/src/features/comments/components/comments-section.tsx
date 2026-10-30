import { CreateCommentSchema, type Comment, type ProjectRole } from '@app/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { FormField } from '../../../components/form-field.tsx';
import { QueryState } from '../../../components/query-state.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { applyApiError } from '../../../lib/form-errors.ts';
import {
  useAddCommentMutation,
  useCommentsQuery,
  useDeleteCommentMutation,
  useEditCommentMutation,
} from '../api/comments-api.ts';
import { canDeleteComment, canEditComment } from '../lib/permissions.ts';

interface CommentFormValues {
  body: string;
}

function AddCommentForm({ taskId }: { taskId: string }): JSX.Element {
  const add = useAddCommentMutation(taskId);
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(CreateCommentSchema),
    defaultValues: { body: '' },
  });
  const { errors } = form.formState;
  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync(values.body);
      form.reset();
    } catch (error) {
      applyApiError(error, form.setError);
    }
  });
  return (
    <form aria-label="Add comment" onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
      <FormField id="comment-body" label="Add a comment" error={errors.body?.message}>
        <Input id="comment-body" {...form.register('body')} />
      </FormField>
      {errors.root ? (
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      ) : null}
      <Button type="submit" disabled={add.isPending}>
        Post comment
      </Button>
    </form>
  );
}

interface CommentItemProps {
  comment: Comment;
  userId: string;
  role: ProjectRole;
}

function CommentItem({ comment, userId, role }: CommentItemProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const edit = useEditCommentMutation();
  const remove = useDeleteCommentMutation();
  const error = edit.error ?? remove.error;

  const save = async (): Promise<void> => {
    try {
      await edit.mutateAsync({ commentId: comment.id, body: draft });
      setEditing(false);
    } catch {
      // The error is shown from the mutation state below.
    }
  };

  return (
    <li className="py-3">
      <p className="text-sm text-slate-500">
        {comment.author.name} · {new Date(comment.createdAt).toLocaleString()}
        {comment.editedAt ? <span> (edited)</span> : null}
      </p>
      {editing ? (
        <div className="mt-1 flex gap-2">
          <Input
            aria-label="Edit comment"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button size="sm" onClick={() => void save()}>
            Save
          </Button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap">{comment.body}</p>
      )}
      <div className="mt-1 flex gap-2">
        {canEditComment(comment, userId) && !editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
        {canDeleteComment(comment, userId, role) ? (
          <Button variant="ghost" size="sm" onClick={() => remove.mutate(comment.id)}>
            Delete
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error.message}
        </p>
      ) : null}
    </li>
  );
}

interface CommentsSectionProps {
  taskId: string;
  userId: string;
  role: ProjectRole;
  readOnly: boolean;
}

// FR-UI-008: add, edit and delete according to permissions.
export function CommentsSection({
  taskId,
  userId,
  role,
  readOnly,
}: CommentsSectionProps): JSX.Element {
  const [page, setPage] = useState(1);
  const comments = useCommentsQuery(taskId, page);
  const meta = comments.data?.meta;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Comments</h2>
      <QueryState
        isLoading={comments.isPending}
        error={comments.error}
        isEmpty={comments.data?.items.length === 0}
        emptyMessage="No comments yet."
        onRetry={() => void comments.refetch()}
      >
        <ul className="divide-y divide-slate-200">
          {comments.data?.items.map((comment) => (
            <CommentItem key={comment.id} comment={comment} userId={userId} role={role} />
          ))}
        </ul>
      </QueryState>
      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center gap-3 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous comments
          </Button>
          <span>
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next comments
          </Button>
        </div>
      ) : null}
      {readOnly ? null : <AddCommentForm taskId={taskId} />}
    </Card>
  );
}
