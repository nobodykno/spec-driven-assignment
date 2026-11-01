import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';
import { CommentsSection } from './comments-section.tsx';

const TASK = '00000000-0000-4000-8000-0000000000bb';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';
const NOW = '2030-01-01T00:00:00.000Z';
const LIST = `GET /tasks/${TASK}/comments?page=1&pageSize=20`;

function makeComment(id: string, body: string, authorId: string, editedAt: string | null): object {
  return {
    id,
    taskId: TASK,
    author: { id: authorId, name: authorId === USER.id ? 'Ada Owner' : 'Bob' },
    body,
    editedAt,
    createdAt: NOW,
  };
}

function page(items: object[]): Response {
  return jsonResponse({
    items,
    meta: { page: 1, pageSize: 20, total: items.length, totalPages: 1 },
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CommentsSection', () => {
  it('FR-UI-008: Add comment', async () => {
    const stored: object[] = [];
    let posted: unknown = null;
    const fetchMock = stubFetch({
      [LIST]: () => page(stored),
      [`POST /tasks/${TASK}/comments`]: (_url, init) => {
        posted = JSON.parse(String(init?.body));
        const created = makeComment(
          '00000000-0000-4000-8000-0000000000c1',
          'First note',
          USER.id,
          null,
        );
        stored.push(created);
        return jsonResponse(created, 201);
      },
    });
    renderWithProviders(
      <CommentsSection taskId={TASK} userId={USER.id} role="MEMBER" readOnly={false} />,
    );
    expect(await screen.findByText('No comments yet.')).toBeTruthy();
    const input = screen.getByLabelText('Add a comment');
    const post = screen.getByRole('button', { name: 'Post comment' });

    // Empty or whitespace-only comment: field message, nothing sent.
    await userEvent.click(post);
    expect(await screen.findByText('Comment is required')).toBeTruthy();
    await userEvent.type(input, '   ');
    await userEvent.click(post);
    expect(screen.getByText('Comment is required')).toBeTruthy();
    // A comment over 2000 characters is rejected, nothing sent.
    await userEvent.clear(input);
    await userEvent.click(input);
    await userEvent.paste('x'.repeat(2001));
    await userEvent.click(post);
    await waitFor(() => expect(screen.queryByText('Comment is required')).toBeNull());
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);

    // A valid comment is sent and appears in the list.
    await userEvent.clear(input);
    await userEvent.type(input, 'First note');
    await userEvent.click(post);
    expect(await screen.findByText('First note')).toBeTruthy();
    expect(posted).toEqual({ body: 'First note' });
    expect((screen.getByLabelText('Add a comment') as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('No comments yet.')).toBeNull();
  });

  it('FR-UI-008: Buttons follow permissions', async () => {
    const own = makeComment('00000000-0000-4000-8000-0000000000c2', 'Mine', USER.id, null);
    const theirs = makeComment('00000000-0000-4000-8000-0000000000c3', 'Theirs', OTHER_USER, null);
    stubFetch({ [LIST]: () => page([own, theirs]) });

    // A Member: edit and delete on own comment only.
    renderWithProviders(
      <CommentsSection taskId={TASK} userId={USER.id} role="MEMBER" readOnly={false} />,
    );
    let mine = (await screen.findByText('Mine')).closest('li') as HTMLElement;
    let other = screen.getByText('Theirs').closest('li') as HTMLElement;
    expect(within(mine).getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(within(mine).getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(within(other).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(other).queryByRole('button', { name: 'Delete' })).toBeNull();
    cleanup();

    // An Owner: delete (not edit) on another author's comment.
    renderWithProviders(
      <CommentsSection taskId={TASK} userId={USER.id} role="OWNER" readOnly={false} />,
    );
    mine = (await screen.findByText('Mine')).closest('li') as HTMLElement;
    other = screen.getByText('Theirs').closest('li') as HTMLElement;
    expect(within(other).getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(within(other).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(mine).getByRole('button', { name: 'Edit' })).toBeTruthy();
  });

  it('FR-UI-008: Edited indicator and API error', async () => {
    const edited = makeComment('00000000-0000-4000-8000-0000000000c4', 'Edited one', USER.id, NOW);
    const plain = makeComment('00000000-0000-4000-8000-0000000000c5', 'Plain one', USER.id, null);
    stubFetch({
      [LIST]: () => page([edited, plain]),
      ['DELETE /comments/00000000-0000-4000-8000-0000000000c4']: () =>
        errorResponse('FORBIDDEN', 'You cannot delete this comment', 403),
      ['PATCH /comments/00000000-0000-4000-8000-0000000000c5']: () =>
        errorResponse('NOT_FOUND', 'Comment not found', 404),
    });
    renderWithProviders(
      <CommentsSection taskId={TASK} userId={USER.id} role="MEMBER" readOnly={false} />,
    );
    const editedItem = (await screen.findByText('Edited one')).closest('li') as HTMLElement;
    const plainItem = screen.getByText('Plain one').closest('li') as HTMLElement;
    expect(within(editedItem).getByText('(edited)')).toBeTruthy();
    expect(within(plainItem).queryByText('(edited)')).toBeNull();

    // 403 from the API is shown on the comment.
    await userEvent.click(within(editedItem).getByRole('button', { name: 'Delete' }));
    expect((await within(editedItem).findByRole('alert')).textContent).toBe(
      'You cannot delete this comment',
    );

    // 404 on edit is shown on the comment as well.
    await userEvent.click(within(plainItem).getByRole('button', { name: 'Edit' }));
    await userEvent.click(within(plainItem).getByRole('button', { name: 'Save' }));
    expect((await within(plainItem).findByRole('alert')).textContent).toBe('Comment not found');
  });
});
