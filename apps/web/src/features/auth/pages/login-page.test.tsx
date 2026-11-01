import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type JSX } from 'react';
import { useRoutes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../../lib/auth-store.ts';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';
import { appRoutes } from '../../../routes/index.tsx';
import { LoginPage } from './login-page.tsx';
import { RegisterPage } from './register-page.tsx';

beforeEach(() => authStore.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Routes(): JSX.Element | null {
  return useRoutes(appRoutes);
}

describe('LoginPage', () => {
  it('FR-UI-001: Successful login', async () => {
    const fetchMock = stubFetch({
      'POST /auth/login': () => jsonResponse({ accessToken: 'tok', expiresIn: 900, user: USER }),
      'GET /projects': () => jsonResponse({ items: [] }),
      'GET /health': () => jsonResponse({ status: 'ok' }),
    });
    renderWithProviders(<Routes />, '/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefg1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeTruthy();
    expect(authStore.getAccessToken()).toBe('tok');
    const login = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith('/auth/login') && init?.method === 'POST',
    );
    expect(JSON.parse(String(login?.[1]?.body))).toEqual({
      email: 'ada@example.com',
      password: 'abcdefg1',
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('FR-UI-001: Inline validation errors', async () => {
    // Login: empty fields show messages next to the fields and nothing is sent.
    const fetchMock = stubFetch({
      'POST /auth/login': () =>
        errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401),
    });
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Password is required')).toBeTruthy();
    expect(screen.getAllByRole('alert').length).toBeGreaterThanOrEqual(2);
    expect(fetchMock).not.toHaveBeenCalled();

    // Login: server INVALID_CREDENTIALS is shown on the form.
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Invalid email or password')).toBeTruthy();
    expect(authStore.getState().status).toBe('guest');
    cleanup();

    // Register: password rule (8 chars, a letter and a number) and name required.
    const registerFetch = stubFetch({
      'POST /auth/register': () =>
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [{ path: 'email', message: 'Invalid email address' }],
            },
          },
          400,
        ),
    });
    renderWithProviders(<RegisterPage />);
    await userEvent.type(screen.getByLabelText('Password'), 'short1');
    await userEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect(await screen.findByText('Name is required')).toBeTruthy();
    expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    expect(registerFetch).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefgh');
    await userEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect(await screen.findByText('Password must contain a number')).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), '12345678');
    await userEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect(await screen.findByText('Password must contain a letter')).toBeTruthy();
    expect(registerFetch).not.toHaveBeenCalled();

    // Register: server VALIDATION_ERROR details appear next to the field.
    await userEvent.type(screen.getByLabelText('Name'), 'Ada');
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefg1');
    await userEvent.click(screen.getByRole('button', { name: /create|register|sign up/i }));
    expect(await screen.findByText('Invalid email address')).toBeTruthy();
    expect(registerFetch).toHaveBeenCalledTimes(1);
  });

  it('FR-UI-001: Logout', async () => {
    authStore.setSession('tok', USER);
    const fetchMock = stubFetch({
      'POST /auth/logout': () => new Response(null, { status: 204 }),
      'GET /projects': () => jsonResponse({ items: [] }),
      'GET /health': () => jsonResponse({ status: 'ok' }),
    });
    renderWithProviders(<Routes />, '/projects');
    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeTruthy();
    expect(authStore.getState().status).toBe('guest');
    expect(authStore.getAccessToken()).toBeNull();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => String(url).endsWith('/auth/logout') && init?.method === 'POST',
      ),
    ).toBe(true);
  });
});
