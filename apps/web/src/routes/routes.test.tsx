import { cleanup, screen } from '@testing-library/react';
import { useRoutes } from 'react-router';
import { type JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../lib/auth-store.ts';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../test/test-helpers.tsx';
import { appRoutes } from './index.tsx';

function Routes(): JSX.Element | null {
  return useRoutes(appRoutes);
}

beforeEach(() => stubFetch({ 'GET /health': () => jsonResponse({ status: 'ok' }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('protected routes', () => {
  it('FR-AUTH-005: Protected page as guest', async () => {
    authStore.clear();
    const fetchMock = stubFetch({ 'GET /health': () => jsonResponse({ status: 'ok' }) });
    renderWithProviders(<Routes />, '/projects');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Projects' })).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/projects'))).toBe(false);
  });

  it('FR-UI-002: Refresh fails', async () => {
    authStore.setSession('old-token', USER);
    stubFetch({
      'GET /health': () => jsonResponse({ status: 'ok' }),
      'GET /projects': () => errorResponse('UNAUTHORIZED', 'expired', 401),
      'POST /auth/refresh': () => errorResponse('INVALID_REFRESH_TOKEN', 'no', 401),
    });
    renderWithProviders(<Routes />, '/projects');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(authStore.getState().status).toBe('guest');
    expect(authStore.getAccessToken()).toBeNull();
  });

  it('FR-AUTH-005: an authenticated user on /login is sent to /projects', async () => {
    authStore.setSession('token', USER);
    stubFetch({
      'GET /health': () => jsonResponse({ status: 'ok' }),
      'GET /projects': () => jsonResponse({ items: [] }),
    });
    renderWithProviders(<Routes />, '/login');
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeTruthy();
  });
});
