import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '../../../lib/auth-store.ts';
import {
  errorResponse,
  jsonResponse,
  renderWithProviders,
  stubFetch,
  USER,
} from '../../../test/test-helpers.tsx';
import { LoginPage } from './login-page.tsx';

beforeEach(() => authStore.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('FR-UI-001: shows inline validation errors without calling the API', async () => {
    const fetchMock = stubFetch({});
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('FR-UI-001: shows the server message for wrong credentials', async () => {
    stubFetch({
      'POST /auth/login': () =>
        errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401),
    });
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Invalid email or password')).toBeTruthy();
    expect(authStore.getState().status).toBe('guest');
  });

  it('FR-UI-001: a successful login stores the session in memory', async () => {
    stubFetch({
      'POST /auth/login': () => jsonResponse({ accessToken: 'tok', expiresIn: 900, user: USER }),
    });
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'abcdefg1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await vi.waitFor(() => expect(authStore.getAccessToken()).toBe('tok'));
  });
});
