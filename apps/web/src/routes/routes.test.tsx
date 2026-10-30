import { cleanup, screen } from '@testing-library/react';
import { useRoutes } from 'react-router';
import { type JSX } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../lib/auth-store.ts';
import { jsonResponse, renderWithProviders, stubFetch, USER } from '../test/test-helpers.tsx';
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
  it('FR-AUTH-005: a guest opening /projects is redirected to the login page', async () => {
    authStore.clear();
    renderWithProviders(<Routes />, '/projects');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
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
