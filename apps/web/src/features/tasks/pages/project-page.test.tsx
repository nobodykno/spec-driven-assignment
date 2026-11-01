import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation, useRoutes } from 'react-router';
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
  const location = useLocation();
  const element = useRoutes(taskRoutes);
  return (
    <>
      <output data-testid="location">{location.search}</output>
      {element}
    </>
  );
}

const EMPTY_LIST = { items: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
const BASE = `GET /projects/${PROJECT}/tasks?`;
const TAIL = 'sort=createdAt&order=desc&page=1&pageSize=20';

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectPage', () => {
  it('FR-UI-005: State survives reload', async () => {
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
    expect((screen.getByLabelText('Order') as HTMLSelectElement).value).toBe('asc');
    expect((screen.getByLabelText('TODO') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('HIGH') as HTMLInputElement).checked).toBe(true);
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toContain(
      `/api/v1/projects/${PROJECT}/tasks?status=TODO&priority=HIGH&sort=dueDate&order=asc&page=2&pageSize=20`,
    );
  });

  it('FR-UI-005: Invalid URL value', async () => {
    const fetchMock = stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}${TAIL}`]: () => jsonResponse({ ...EMPTY_LIST, items: [task] }),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}?pageSize=500&sort=bogus&page=0`);
    expect(await screen.findByText('Write the report')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByLabelText('Sort by') as HTMLSelectElement).value).toBe('createdAt');
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes('pageSize=20') && url.includes('sort=createdAt'))).toBe(
      true,
    );
    expect(urls.some((url) => url.includes('pageSize=500') || url.includes('bogus'))).toBe(false);
  });

  it('FR-UI-005: Pagination', async () => {
    const page = (n: number): unknown => ({
      items: [task],
      meta: { page: n, pageSize: 20, total: 21, totalPages: 2 },
    });
    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}${TAIL}`]: () => jsonResponse(page(1)),
      [`${BASE}sort=createdAt&order=desc&page=2&pageSize=20`]: () => jsonResponse(page(2)),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    expect(await screen.findByText(/Page 1 of 2/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(/Page 2 of 2/)).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toContain('page=2');
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('FR-UI-010: States', async () => {
    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}${TAIL}`]: () => new Promise<Response>(() => {}) as never,
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    expect(await screen.findByText('Loading…')).toBeTruthy();
    cleanup();

    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}${TAIL}`]: () => jsonResponse(EMPTY_LIST),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    expect(await screen.findByText('No tasks match these filters.')).toBeTruthy();
    cleanup();

    let calls = 0;
    stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}${TAIL}`]: () => {
        calls += 1;
        return calls === 1
          ? errorResponse('INTERNAL_ERROR', 'Server exploded', 500)
          : jsonResponse({ ...EMPTY_LIST, items: [task] });
      },
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}`);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Server exploded');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Write the report')).toBeTruthy();
    expect(calls).toBe(2);
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

  it('FR-UI-005: Filters in URL', async () => {
    const one = { items: [task], meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
    const fetchMock = stubFetch({
      [`GET /projects/${PROJECT}`]: () => jsonResponse(projectDetail),
      [`${BASE}sort=createdAt&order=desc&page=3&pageSize=20`]: () => jsonResponse(EMPTY_LIST),
      [`${BASE}status=TODO&${TAIL}`]: () => jsonResponse(one),
      [`${BASE}status=TODO&priority=HIGH&${TAIL}`]: () => jsonResponse(one),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}?page=3`);
    await userEvent.click(await screen.findByLabelText('TODO'));
    await userEvent.click(await screen.findByLabelText('HIGH'));
    expect(await screen.findByText('Write the report')).toBeTruthy();
    const search = screen.getByTestId('location').textContent ?? '';
    expect(search).toContain('status=TODO&priority=HIGH');
    expect(search).not.toContain('page=');
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe(
      `/api/v1/projects/${PROJECT}/tasks?status=TODO&priority=HIGH&${TAIL}`,
    );
  });
});

describe('TaskDetailPage', () => {
  it('FR-UI-006: Shows fields', async () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => jsonResponse(task) });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(await screen.findByRole('heading', { name: 'Write the report' })).toBeTruthy();
    expect(screen.getByText('TODO')).toBeTruthy();
    expect(screen.getAllByText('Ada Owner').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Created by')).toBeTruthy();
    const stamp = new Date(NOW).toLocaleString();
    expect(screen.getAllByText(stamp).length).toBe(2);
    expect(screen.getByText('Quarterly numbers')).toBeTruthy();
    expect(screen.getByText('2030-02-01')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
  });

  it('FR-UI-006: Task not found', async () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => errorResponse('NOT_FOUND', 'Task not found', 404) });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect((await screen.findByRole('alert')).textContent).toBe('Task not found.');
    expect(screen.queryByRole('heading', { name: 'Write the report' })).toBeNull();
  });

  it('FR-UI-010: shows a loading state while the task loads', () => {
    stubFetch({ [`GET /tasks/${TASK}`]: () => new Promise<Response>(() => {}) as never });
    renderWithProviders(<Routes />, `/tasks/${TASK}`);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
