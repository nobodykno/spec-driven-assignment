import { CreateTaskSchema } from '@app/shared';
import { cleanup, screen, waitFor } from '@testing-library/react';
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
const NOW = '2030-01-01T00:00:00.000Z';
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
const LIST = `GET /projects/${PROJECT}/tasks?sort=createdAt&order=desc&page=1&pageSize=20`;

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

const project = {
  id: PROJECT,
  name: 'Alpha',
  description: null,
  status: 'ACTIVE',
  ownerId: USER.id,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  members: [{ userId: USER.id, name: 'Ada Owner', email: 'ada@example.com', role: 'OWNER' }],
  myRole: 'OWNER',
};

function Routes(): JSX.Element | null {
  return useRoutes(taskRoutes);
}

function bodyOf(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
}

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('task create and edit forms', () => {
  it('FR-UI-007: Create and edit', async () => {
    let posted: unknown = null;
    let patched: unknown = null;
    const fetchMock = stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project),
      [LIST]: () => jsonResponse(EMPTY_PAGE),
      [`POST /projects/${PROJECT}/tasks`]: (_url, init) => {
        posted = bodyOf(init);
        return jsonResponse({ ...task, title: 'Plan sprint' }, 201);
      },
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    await userEvent.type(await screen.findByLabelText('Title'), 'Plan sprint');
    await userEvent.click(screen.getByRole('button', { name: 'Create task' }));
    await waitFor(() => expect(posted).toMatchObject({ title: 'Plan sprint', priority: 'MEDIUM' }));
    // The views refresh: the task list is requested again after the create.
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/tasks?')).length).toBe(
        2,
      ),
    );
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('');
    cleanup();

    const editFetch = stubFetch({
      [`GET /tasks/${TASK}`]: () => jsonResponse(task),
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project),
      [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
      [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
      [`PATCH /tasks/${TASK}`]: (_url, init) => {
        patched = bodyOf(init);
        return jsonResponse({ ...task, title: 'Write the final report' });
      },
    });
    const getCount = (path: string): number =>
      editFetch.mock.calls.filter(
        ([url, init]) => (init?.method ?? 'GET') === 'GET' && String(url).endsWith(path),
      ).length;
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit task' }));
    const title = await screen.findByLabelText('Title');
    await userEvent.clear(title);
    await userEvent.type(title, 'Write the final report');
    await userEvent.click(screen.getByRole('button', { name: 'Save task' }));
    await waitFor(() => expect(patched).toMatchObject({ title: 'Write the final report' }));
    // The task and activity views refresh after the save.
    await waitFor(() => expect(getCount(`/tasks/${TASK}`)).toBe(2));
    await waitFor(() => expect(getCount(`/tasks/${TASK}/activity?page=1&pageSize=20`)).toBe(2));
  });

  it('FR-UI-007: Validation and server errors', async () => {
    let posts = 0;
    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(project),
      [LIST]: () => jsonResponse(EMPTY_PAGE),
      [`POST /projects/${PROJECT}/tasks`]: () => {
        posts += 1;
        return errorResponse('ASSIGNEE_NOT_MEMBER', 'Assignee is not a member', 400);
      },
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    const create = await screen.findByRole('button', { name: 'Create task' });

    // Empty title: field error, no request.
    await userEvent.click(create);
    expect(await screen.findByText('Title is required')).toBeTruthy();
    expect(posts).toBe(0);

    // A title longer than 200 characters is rejected on the form, no request.
    await userEvent.click(screen.getByLabelText('Title'));
    await userEvent.paste('x'.repeat(201));
    await userEvent.click(create);
    const tooLong = CreateTaskSchema.safeParse({ title: 'x'.repeat(201) });
    const tooLongMessage = tooLong.success ? '' : (tooLong.error.issues[0]?.message ?? '');
    expect(tooLongMessage).not.toBe('');
    expect(await screen.findByText(tooLongMessage)).toBeTruthy();
    expect(screen.queryByText('Title is required')).toBeNull();
    expect(posts).toBe(0);
    cleanup();

    const cases: Array<[string, string, number]> = [
      ['ASSIGNEE_NOT_MEMBER', 'Assignee is not a member', 400],
      ['TASK_ARCHIVED', 'Task is archived', 409],
      ['PROJECT_ARCHIVED', 'Project is archived', 409],
    ];
    for (const [code, message, status] of cases) {
      stubFetch({
        [`GET /projects/${PROJECT}`]: () => jsonResponse(project),
        [LIST]: () => jsonResponse(EMPTY_PAGE),
        [`POST /projects/${PROJECT}/tasks`]: () => errorResponse(code, message, status),
      });
      renderWithProviders(<Routes />, `/projects/${PROJECT}`);
      await userEvent.type(await screen.findByLabelText('Title'), 'A task');
      await userEvent.click(screen.getByRole('button', { name: 'Create task' }));
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(message);
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('A task');
      cleanup();
    }

    // Edit form: server errors from PATCH show on the form and the entered title is kept.
    const editCases: Array<[string, string, number]> = [
      ['VALIDATION_ERROR', 'Invalid request', 400],
      ['TASK_ARCHIVED', 'Task is archived', 409],
      ['PROJECT_ARCHIVED', 'Project is archived', 409],
    ];
    for (const [code, message, status] of editCases) {
      stubFetch({
        [`GET /tasks/${TASK}`]: () => jsonResponse(task),
        [`GET /projects/${PROJECT}`]: () => jsonResponse(project),
        [`GET /tasks/${TASK}/comments?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
        [`GET /tasks/${TASK}/activity?page=1&pageSize=20`]: () => jsonResponse(EMPTY_PAGE),
        [`PATCH /tasks/${TASK}`]: () => errorResponse(code, message, status),
      });
      renderWithProviders(<Routes />, `/tasks/${TASK}`);
      await userEvent.click(await screen.findByRole('button', { name: 'Edit task' }));
      const title = await screen.findByLabelText('Title');
      await userEvent.clear(title);
      await userEvent.type(title, 'Renamed');
      await userEvent.click(screen.getByRole('button', { name: 'Save task' }));
      const editAlert = await screen.findByRole('alert');
      expect(editAlert.textContent).toBe(message);
      expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Renamed');
      cleanup();
    }
  });
});
