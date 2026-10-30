import { cleanup, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../../lib/auth-store.ts';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';
import { ProjectsPage } from './projects-page.tsx';

const NOW = '2030-01-01T00:00:00.000Z';

function project(id: string, name: string, myRole: 'OWNER' | 'MEMBER'): Record<string, unknown> {
  return {
    id,
    name,
    description: null,
    status: 'ACTIVE',
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
  it('FR-UI-004: owner-only controls are hidden for Members', async () => {
    stubFetch({
      'GET /projects': () =>
        jsonResponse({
          items: [
            project('00000000-0000-4000-8000-0000000000a1', 'Owned', 'OWNER'),
            project('00000000-0000-4000-8000-0000000000a2', 'Joined', 'MEMBER'),
          ],
        }),
    });
    renderWithProviders(<ProjectsPage />);
    const owned = (await screen.findByText('Owned')).closest('li');
    const joined = (await screen.findByText('Joined')).closest('li');
    expect(within(owned as HTMLElement).getByRole('button', { name: 'Archive' })).toBeTruthy();
    expect(within(joined as HTMLElement).queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(within(joined as HTMLElement).queryByRole('link', { name: 'Settings' })).toBeNull();
  });

  it('FR-UI-010: shows an empty state when there are no projects', async () => {
    stubFetch({ 'GET /projects': () => jsonResponse({ items: [] }) });
    renderWithProviders(<ProjectsPage />);
    expect(await screen.findByText(/not a member of any project/i)).toBeTruthy();
  });

  it('FR-UI-010: shows an error state with retry when the request fails', async () => {
    stubFetch({ 'GET /projects': () => errorResponse('INTERNAL_ERROR', 'Boom', 500) });
    renderWithProviders(<ProjectsPage />);
    expect((await screen.findByRole('alert')).textContent).toContain('Boom');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('FR-UI-010: shows a loading state while the request is pending', () => {
    stubFetch({ 'GET /projects': () => new Promise<Response>(() => {}) as never });
    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });
});
