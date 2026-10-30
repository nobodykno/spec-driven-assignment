import { ProjectListResponseSchema } from '@app/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorResponse, jsonResponse, stubFetch, USER } from '../test/test-helpers.tsx';
import { ApiError, apiFetch } from './api-client.ts';
import { authStore } from './auth-store.ts';

beforeEach(() => authStore.setSession('old-token', USER));
afterEach(() => vi.unstubAllGlobals());

describe('apiFetch', () => {
  it('FR-UI-002: a 401 refreshes once and retries the call with the new token', async () => {
    let attempts = 0;
    const fetchMock = stubFetch({
      'GET /projects': (_url, init) => {
        attempts += 1;
        const header = new Headers(init?.headers).get('Authorization');
        return header === 'Bearer new-token'
          ? jsonResponse({ items: [] })
          : errorResponse('UNAUTHORIZED', 'expired', 401);
      },
      'POST /auth/refresh': () => jsonResponse({ accessToken: 'new-token', expiresIn: 900 }),
    });
    const result = await apiFetch('/projects', { parser: ProjectListResponseSchema });
    expect(result.items).toEqual([]);
    expect(attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(authStore.getAccessToken()).toBe('new-token');
  });

  it('FR-UI-002: when refresh fails the session is cleared and the error is thrown', async () => {
    stubFetch({
      'GET /projects': () => errorResponse('UNAUTHORIZED', 'expired', 401),
      'POST /auth/refresh': () => errorResponse('INVALID_REFRESH_TOKEN', 'no', 401),
    });
    await expect(
      apiFetch('/projects', { parser: ProjectListResponseSchema }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(authStore.getState().status).toBe('guest');
  });

  it('FR-UI-001: an API error keeps its code and field details', async () => {
    stubFetch({
      'POST /projects': () =>
        jsonResponse(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Validation failed',
              details: [{ path: 'name', message: 'Name is required' }],
            },
          },
          400,
        ),
    });
    const failure = await apiFetch('/projects', {
      method: 'POST',
      body: {},
      parser: ProjectListResponseSchema,
    }).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect((failure as ApiError).details).toEqual([{ path: 'name', message: 'Name is required' }]);
  });
});
