import { ErrorResponseSchema, TokenResponseSchema, type ErrorDetail } from '@app/shared';
import { authStore } from './auth-store.ts';

const API_BASE = '/api/v1';

export interface Parser<T> {
  parse: (data: unknown) => T;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  // Login/refresh must not trigger a refresh-and-retry on their own 401.
  skipRefresh?: boolean;
  // Explicit bearer token, used while restoring a session before the store holds one.
  token?: string;
}

// SDS §6.1: { error: { code, message, details? } }
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshing: Promise<string | null> | null = null;

async function requestRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    const parsed = TokenResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.accessToken : null;
  } catch {
    return null;
  }
}

// FR-UI-002: concurrent 401s share one refresh call.
export function refreshAccessToken(): Promise<string | null> {
  refreshing ??= requestRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function send(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const parsed = ErrorResponseSchema.safeParse(await response.json());
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      return new ApiError(response.status, code, message, details);
    }
  } catch {
    // Not JSON: fall through to the generic error.
  }
  return new ApiError(response.status, 'INTERNAL_ERROR', 'Unexpected server response');
}

// FR-UI-002: on 401 refresh once and retry; if refresh fails the session is cleared and the
// protected routes redirect to /login.
async function execute(path: string, options: RequestOptions): Promise<Response> {
  let response = await send(path, options, options.token ?? authStore.getAccessToken());
  if (response.status === 401 && !options.skipRefresh) {
    const token = await refreshAccessToken();
    if (!token) {
      authStore.clear();
      throw await toApiError(response);
    }
    authStore.setAccessToken(token);
    response = await send(path, options, token);
  }
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions & { parser: Parser<T> },
): Promise<T> {
  const response = await execute(path, options);
  return options.parser.parse(await response.json());
}

// For endpoints that answer 204 No Content.
export async function apiRequest(path: string, options: RequestOptions = {}): Promise<void> {
  await execute(path, options);
}
