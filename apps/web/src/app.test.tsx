import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest';
import { App } from './app.tsx';

function mockFetch(implementation: () => Promise<Response>): Mock<() => Promise<Response>> {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('FR-SYS-002: shows API: online when health is ok', async () => {
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse({ status: 'ok' })));
    render(<App />);
    expect(await screen.findByText('API: online')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.anything());
  });

  it('FR-SYS-002: shows API: offline on 503', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ status: 'error' }, 503)));
    render(<App />);
    expect(await screen.findByText('API: offline')).toBeTruthy();
  });

  it('FR-SYS-002: shows API: offline on network error', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    render(<App />);
    expect(await screen.findByText('API: offline')).toBeTruthy();
  });

  it('FR-SYS-002: shows API: offline on unexpected body', async () => {
    mockFetch(() => Promise.resolve(jsonResponse({ status: 'maybe' })));
    render(<App />);
    expect(await screen.findByText('API: offline')).toBeTruthy();
  });

  it('FR-SYS-002: shows loading while pending', () => {
    mockFetch(() => new Promise<Response>(() => {}));
    render(<App />);
    expect(screen.getByRole('status').textContent).toMatch(/checking/i);
    expect(screen.queryByText(/online|offline/)).toBeNull();
  });
});
