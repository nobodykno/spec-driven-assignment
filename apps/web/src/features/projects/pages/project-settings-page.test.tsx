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

const NOW = '2030-01-01T00:00:00.000Z';
const PROJECT = '00000000-0000-4000-8000-0000000000a1';
const BOB = {
  userId: '00000000-0000-4000-8000-0000000000b2',
  name: 'Bob',
  email: 'bob@example.com',
};
const ADA = { userId: USER.id, name: USER.name, email: USER.email };

interface Member {
  userId: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
}

function Routes(): JSX.Element | null {
  return useRoutes(appRoutes);
}

beforeEach(() => authStore.setSession('token', USER));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ProjectSettingsPage', () => {
  it('FR-UI-004: Owner manages members', async () => {
    const members: Member[] = [{ ...ADA, role: 'OWNER' }];
    const added: unknown[] = [];
    const detail = (): Record<string, unknown> => ({
      id: PROJECT,
      name: 'Alpha',
      description: null,
      status: 'ACTIVE',
      ownerId: USER.id,
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
      myRole: 'OWNER',
      members,
    });
    stubFetch({
      'GET /health': () => jsonResponse({ status: 'ok' }),
      [`GET /projects/${PROJECT}`]: () => jsonResponse(detail()),
      [`POST /projects/${PROJECT}/members`]: (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { email: string; role: string };
        added.push(body);
        if (body.email === 'ghost@example.com') {
          return errorResponse('USER_NOT_FOUND', 'No user with that email', 404);
        }
        if (body.email === 'ada@example.com') {
          return errorResponse('ALREADY_MEMBER', 'User is already a member', 409);
        }
        members.push({ ...BOB, role: 'MEMBER' });
        return jsonResponse({ ...BOB, role: 'MEMBER' }, 201);
      },
      [`DELETE /projects/${PROJECT}/members/${BOB.userId}`]: () => {
        members.splice(1, 1);
        return new Response(null, { status: 204 });
      },
      [`DELETE /projects/${PROJECT}/members/${USER.id}`]: () =>
        errorResponse('LAST_OWNER', 'A project needs at least one owner', 409),
    });
    renderWithProviders(<Routes />, `/projects/${PROJECT}/settings`);
    const email = await screen.findByLabelText('Member email');
    const addButton = screen.getByRole('button', { name: 'Add member' });

    // Invalid email is rejected before the request.
    await userEvent.type(email, 'not-an-email');
    await userEvent.click(addButton);
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0);
    expect(added).toHaveLength(0);

    // USER_NOT_FOUND and ALREADY_MEMBER are shown as messages.
    await userEvent.clear(email);
    await userEvent.type(email, 'ghost@example.com');
    await userEvent.click(addButton);
    expect(await screen.findByText('No user with that email')).toBeTruthy();
    await userEvent.clear(email);
    await userEvent.type(email, 'ada@example.com');
    await userEvent.click(addButton);
    expect(await screen.findByText('User is already a member')).toBeTruthy();

    // Add by email: the member list updates.
    await userEvent.clear(email);
    await userEvent.type(email, 'bob@example.com');
    await userEvent.click(addButton);
    expect(await screen.findByRole('button', { name: 'Remove Bob' })).toBeTruthy();
    expect(added.at(-1)).toEqual({ email: 'bob@example.com', role: 'MEMBER' });

    // LAST_OWNER on removing the only owner is shown.
    await userEvent.click(screen.getByRole('button', { name: `Remove ${USER.name}` }));
    expect(await screen.findByText('A project needs at least one owner')).toBeTruthy();

    // Remove a member: the list updates.
    await userEvent.click(screen.getByRole('button', { name: 'Remove Bob' }));
    await vi.waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Bob' })).toBeNull());
    expect(
      within(screen.getAllByRole('list')[0] as HTMLElement).getByText(USER.email),
    ).toBeTruthy();
  });
});
