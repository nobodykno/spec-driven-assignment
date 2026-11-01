import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRoutes } from 'react-router';
import { type JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../../lib/auth-store.ts';
import { taskRoutes } from '../../../routes/task-routes.tsx';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';

const PROJECT = '00000000-0000-4000-8000-0000000000aa';
const TASK = '00000000-0000-4000-8000-0000000000bb';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';
const NOW = '2030-01-01T00:00:00.000Z';
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

const task = {
  id: TASK,
  projectId: PROJECT,
  title: 'Write the report',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  assignee: null,
  createdBy: { id: USER.id, name: 'Ada Owner' },
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

function project(myRole: 'OWNER' | 'MEMBER'): Record<string, unknown> {
  return {
    id: PROJECT,
    name: 'Alpha',
    description: null,
    status: 'ACTIVE',
    ownerId: USER.id,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    members: [{ userId: USER.id, name: 'Ada Owner', email: 'ada@example.com', role: myRole }],
    myRole,
  };
}

const comment = {
  id: '00000000-0000-4000-8000-0000000000cc',
  taskId: TASK,
  author: { id: OTHER_USER, name: 'Bob' },
  body: 'Looks good',
  editedAt: NOW,
  createdAt: NOW,
};

function Routes(): JSX.Element | null {
  return useRoutes(taskRoutes);
}

function stubTaskPage(myRole: 'OWNER' | 'MEMBER'): ReturnType<typeof stubFetch> {
  return stubFetch({
    [`GET /tasks/${TASK}`]: () => jsonResponse(task),
    [`GET /projects/${PROJECT}`]: () => jsonResponse(project(myRole)),
    [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () =>
      jsonResponse({ items: [comment], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
    [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
  });
}

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('task detail page extras', () => {
  it('FR-UI-008: a Member sees no delete or edit button on another author comment', async () => {
    stubTaskPage('MEMBER');
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    const item = (await screen.findByText('Looks good')).closest('li') as HTMLElement;
    expect(within(item).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(item).queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(within(item).getByText('(edited)')).toBeTruthy();
  });

  it('FR-UI-008: an Owner can delete another author comment but not edit it', async () => {
    stubTaskPage('OWNER');
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    const item = (await screen.findByText('Looks good')).closest('li') as HTMLElement;
    expect(within(item).getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(within(item).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('FR-UI-007: Allowed transitions only', async () => {
    stubTaskPage('MEMBER');
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    const select = (await screen.findByLabelText('Status')) as HTMLSelectElement;
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'TODO',
      'IN_PROGRESS',
    ]);
  });

  it('FR-UI-009: shows an empty state when there is no activity', async () => {
    stubTaskPage('MEMBER');
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(await screen.findByText('No activity yet.')).toBeTruthy();
  });

  it('FR-UI-010: States', async () => {
    // Loading: both views show the loading text while their requests are pending.
    stubFetch({
      [`GET /tasks/${TASK}`]: () => jsonResponse(task),
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project('MEMBER')),
      [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () => new Promise<Response>(() => {}),
      [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => new Promise<Response>(() => {}),
    });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    await screen.findByText('Comments');
    expect(screen.getAllByText('Loading…')).toHaveLength(2);
    cleanup();

    // Empty.
    stubFetch({
      [`GET /tasks/${TASK}`]: () => jsonResponse(task),
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project('MEMBER')),
      [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
      [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
    });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(await screen.findByText('No comments yet.')).toBeTruthy();
    expect(await screen.findByText('No activity yet.')).toBeTruthy();
    cleanup();

    // Failing: 403, 404, 500 and a network error each show their message with a retry.
    const failures: Array<[() => Response | Promise<Response>, string]> = [
      [() => errorResponse('FORBIDDEN', 'Not allowed here', 403), 'Not allowed here'],
      [() => errorResponse('NOT_FOUND', 'Nothing here', 404), 'Nothing here'],
      [() => errorResponse('INTERNAL_ERROR', 'Server broke', 500), 'Server broke'],
      [() => Promise.reject(new TypeError('Network down')), 'Network down'],
    ];
    for (const [fail, message] of failures) {
      stubFetch({
        [`GET /tasks/${TASK}`]: () => jsonResponse(task),
        [`GET /projects/${PROJECT}`]: () => jsonResponse(project('MEMBER')),
        [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: fail,
        [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: fail,
      });
      renderWithProviders(<Routes />, `/tasks/${TASK}`);
      await waitFor(() => expect(screen.getAllByText(message)).toHaveLength(2));
      expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(2);
      cleanup();
    }
  });

  it('FR-UI-008: an API error on adding a comment is shown', async () => {
    stubFetch({
      [`GET /tasks/${TASK}`]: () => jsonResponse(task),
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project('MEMBER')),
      [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
      [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
      [`POST /tasks/${TASK}/comments`]: () =>
        errorResponse('TASK_ARCHIVED', 'Task is archived', 409),
    });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    await userEvent.type(await screen.findByLabelText('Add a comment'), 'Hi');
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }));
    expect(await screen.findByText('Task is archived')).toBeTruthy();
  });
});
