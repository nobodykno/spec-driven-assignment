import type { User } from '@app/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { type JSX, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

export const USER: User = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ada Owner',
  email: 'ada@example.com',
  role: 'USER',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

type Handler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

// Routes fetch calls by "METHOD /path"; anything unhandled is a 404.
export function stubFetch(handlers: Record<string, Handler>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const key = `${init?.method ?? 'GET'} ${url.replace('/api/v1', '')}`;
    const handler = handlers[key];
    return handler ? handler(url, init) : errorResponse('NOT_FOUND', `No stub for ${key}`, 404);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderWithProviders(ui: ReactNode, path = '/'): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return render(ui, { wrapper });
}
