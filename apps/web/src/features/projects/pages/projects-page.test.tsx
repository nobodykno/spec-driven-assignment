import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type JSX } from 'react';
import { useRoutes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../../lib/auth-store.ts';
import { appRoutes } from '../../../routes/index.tsx';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';
import { ProjectsPage } from './projects-page.tsx';

const NOW = '2030-01-01T00:00:00.000Z';
const OWNED = '00000000-0000-4000-8000-0000000000a1';

function Routes(): JSX.Element | null {
  return useRoutes(appRoutes);
}

function project(
  id: string,
  name: string,
  myRole: 'OWNER' | 'MEMBER',
  status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE',
): Record<string, unknown> {
  return {
    id,
    name,
    description: null,
    status,
    ownerId: USER.id,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    myRole,
  };
}

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectsPage', () => {
  it('FR-UI-003: List and create', async () => {
    const items: Record<string, unknown>[] = [project(OWNED, 'Existing', 'OWNER')];
    const bodies: unknown[] = [];
    stubFetch({
      'GET /projects': () => jsonResponse({ items }),
      'POST /projects': (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { name: string };
        bodies.push(body);
        const created = project('00000000-0000-4000-8000-0000000000a3', body.name, 'OWNER');
        items.push(created);
        return jsonResponse({ ...created, members: [] }, 201);
      },
    });
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText('Existing')).toBeTruthy();

    // Name is required; nothing is sent while invalid.
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(bodies).toHaveLength(0);

    // Name longer than 100 characters is rejected before the request.
    await userEvent.click(screen.getByLabelText('Name'));
    await userEvent.paste('x'.repeat(101));
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    await vi.waitFor(() => expect(screen.queryByText('Name is required')).toBeNull());
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(bodies).toHaveLength(0);

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Brand new');
    await userEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText('Brand new')).toBeTruthy();
    expect(screen.getByText('Existing')).toBeTruthy();
    expect(bodies).toEqual([{ name: 'Brand new', description: '' }]);
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
  });

  it('FR-UI-003: Edit and archive', async () => {
    const detail = (name: string, status: 'ACTIVE' | 'ARCHIVED'): Record<string, unknown> => ({
      ...project(OWNED, name, 'OWNER', status),
      members: [{ userId: USER.id, name: USER.name, email: USER.email, role: 'OWNER' }],
    });
    let name = 'Alpha';
    let status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE';
    const patches: unknown[] = [];
    let archiveFails = false;
    stubFetch({
      'GET /projects': () =>
        jsonResponse({ items: status === 'ACTIVE' ? [project(OWNED, name, 'OWNER')] : [] }),
      [`GET /projects/${OWNED}`]: () => jsonResponse(detail(name, status)),
      [`PATCH /projects/${OWNED}`]: (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { name: string };
        patches.push(body);
        if (status === 'ARCHIVED') {
          return errorResponse('PROJECT_ARCHIVED', 'Project is archived', 409);
        }
        name = body.name;
        return jsonResponse(detail(name, status));
      },
      [`POST /projects/${OWNED}/archive`]: () => {
        if (archiveFails) {
          return errorResponse('PROJECT_ARCHIVED', 'Project is archived', 409);
        }
        status = 'ARCHIVED';
        return jsonResponse(detail(name, status));
      },
      'GET /health': () => jsonResponse({ status: 'ok' }),
    });

    // Edit: the settings page sends the change and the list shows the new name.
    renderWithProviders(<Routes />, `/projects/${OWNED}/settings`);
    const field = await screen.findByLabelText('Name');
    await userEvent.clear(field);
    await userEvent.type(field, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await vi.waitFor(() => expect(patches).toEqual([{ name: 'Renamed', description: '' }]));
    cleanup();
    renderWithProviders(<Routes />, '/projects');
    expect(await screen.findByText('Renamed')).toBeTruthy();

    // Archive: the project leaves the active list.
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));
    expect(await screen.findByText(/not a member of any project/i)).toBeTruthy();
    expect(screen.queryByText('Renamed')).toBeNull();
    cleanup();

    // PROJECT_ARCHIVED returned by an edit is shown.
    renderWithProviders(<Routes />, `/projects/${OWNED}/settings`);
    const archivedField = await screen.findByLabelText('Name');
    await userEvent.clear(archivedField);
    await userEvent.type(archivedField, 'Too late');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Project is archived')).toBeTruthy();
    cleanup();

    // PROJECT_ARCHIVED returned by archive is shown next to the project.
    status = 'ACTIVE';
    archiveFails = true;
    renderWithProviders(<Routes />, '/projects');
    await userEvent.click(await screen.findByRole('button', { name: 'Archive' }));
    expect(await screen.findByText('Project is archived')).toBeTruthy();
    expect(screen.getByText('Renamed')).toBeTruthy();
  });

  it('FR-UI-004: Member sees no owner controls', async () => {
    const memberDetail = {
      ...project(OWNED, 'Owned', 'MEMBER'),
      members: [{ userId: USER.id, name: USER.name, email: USER.email, role: 'MEMBER' }],
    };
    stubFetch({
      'GET /projects': () =>
        jsonResponse({
          items: [
            project(OWNED, 'Owned', 'OWNER'),
            project('00000000-0000-4000-8000-0000000000a2', 'Joined', 'MEMBER'),
          ],
        }),
      [`GET /projects/${OWNED}`]: () => jsonResponse(memberDetail),
      'GET /health': () => jsonResponse({ status: 'ok' }),
    });
    renderWithProviders(<ProjectsPage />);
    const owned = (await screen.findByText('Owned')).closest('li');
    const joined = (await screen.findByText('Joined')).closest('li');
    expect(within(owned as HTMLElement).getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(within(joined as HTMLElement).queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(within(joined as HTMLElement).queryByRole('link', { name: 'Settings' })).toBeNull();
    cleanup();

    // Opening the settings page as a Member renders no edit or member controls.
    renderWithProviders(<Routes />, `/projects/${OWNED}/settings`);
    await vi.waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Project settings' })).toBeNull(),
    );
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });

  it('FR-UI-010: States', async () => {
    // Loading
    stubFetch({ 'GET /projects': () => new Promise<Response>(() => {}) as never });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Loading…')).toBeTruthy();
    cleanup();

    // Empty
    stubFetch({ 'GET /projects': () => jsonResponse({ items: [] }) });
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText(/not a member of any project/i)).toBeTruthy();
    cleanup();

    // Error with retry: a retry that succeeds shows the list.
    let failing = true;
    stubFetch({
      'GET /projects': () =>
        failing
          ? errorResponse('INTERNAL_ERROR', 'Boom', 500)
          : jsonResponse({ items: [project(OWNED, 'Recovered', 'OWNER')] }),
    });
    renderWithProviders(<ProjectsPage />);
    expect((await screen.findByRole('alert')).textContent).toContain('Boom');
    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Recovered')).toBeTruthy();
  });
});
