import { cleanup, screen } from '@testing-library/react';
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

const task = {
  id: TASK,
  projectId: PROJECT,
  title: 'Write the report',
  description: 'Quarterly numbers',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: '2030-02-01',
  assignee: { id: USER.id, name: 'Ada Owner' },
  createdBy: { id: USER.id, name: 'Ada Owner' },
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const projectDetail = {
  id: PROJECT,
  name: 'Alpha',
  description: null,
  status: 'ACTIVE',
  ownerId: USER.id,
  archivedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  members: [],
  myRole: 'MEMBER',
};

function Routes(): JSX.Element | null {
  return useRoutes(taskRoutes);
}

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectPage', () => {
  it('FR-UI-005: the request reflects the filters in the URL', async () => {
    const fetchMock = stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`GET /projects/${PROJECT}/tasks?status=TODO&priority=HIGH&sort=dueDate&order=asc&page=2&pageSize=20`]:
        () =>
          jsonResponse({
            items: [task],
            meta: { page: 2, pageSize: 20, total: 21, totalPages: 2 },
          }),
    });
    renderWithProviders(
      <Routes />,
      `/projects/${PROJECT}?status=TODO&priority=HIGH&sort=dueDate&order=asc&page=2`,
    );
    expect(await screen.findByText('Write the report')).toBeTruthy();
    expect(screen.getByText(/Page 2 of 2/)).toBeTruthy();
    expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('dueDate');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('FR-UI-010: shows an empty state when no task matches', async () => {
    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`GET /projects/${PROJECT}/tasks?sort=createdAt&order=desc&page=1&pageSize=20`]: () =>
        jsonResponse({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    expect(await screen.findByText('No tasks match these filters.')).toBeTruthy();
  });

  it('FR-UI-005: choosing a filter updates the request and resets the page', async () => {
    const fetchMock = stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`GET /projects/${PROJECT}/tasks?sort=createdAt&order=desc&page=1&pageSize=20`]: () =>
        jsonResponse({ items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
      [`GET /projects/${PROJECT}/tasks?status=DONE&sort=createdAt&order=desc&page=1&pageSize=20`]:
        () =>
          jsonResponse({ items: [task], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}?page=3`);
    await userEvent.click(await screen.findByLabelText('DONE'));
    expect(await screen.findByText('Write the report')).toBeTruthy();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('status=DONE');
  });
});

describe('TaskDetailPage', () => {
  it('FR-UI-006: shows all task fields', async () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => jsonResponse(task) });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(await screen.findByRole('heading', { name: 'Write the report' })).toBeTruthy();
    expect(screen.getByText('Quarterly numbers')).toBeTruthy();
    expect(screen.getByText('2030-02-01')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
  });

  it('FR-UI-006: shows a not-found message on 404', async () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => errorResponse('NOT_FOUND', 'Task not found', 404) });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect((await screen.findByRole('alert')).textContent).toContain('Task not found');
  });

  it('FR-UI-010: shows a loading state while the task loads', () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => new Promise<Response>(() => {}) as never });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
