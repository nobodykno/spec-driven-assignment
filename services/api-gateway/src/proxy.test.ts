import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';
import { testConfig } from './test-support.js';

describe('gateway auth proxy', () => {
  let upstream: Server;
  let upstreamUrl: string;

  beforeAll(async () => {
    const auth = express();
    auth.get('/health', (_req, res) => {
      res.status(200).json({ status: 'ok', from: 'auth' });
    });
    upstream = await new Promise<Server>((resolve) => {
      const server = auth.listen(0, '127.0.0.1', () => resolve(server));
    });
    upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => upstream.close(() => resolve()));
  });

  it('FR-SYS-001: /api/v1/auth/health is forwarded to auth /health', async () => {
    const response = await request(createApp(testConfig({ authServiceUrl: upstreamUrl }))).get(
      '/api/v1/auth/health',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', from: 'auth' });
  });

  it('FR-SYS-001: /api/v1/auth/* returns 503 SERVICE_UNAVAILABLE without internal details when auth is unreachable', async () => {
    const response = await request(createApp(testConfig())).get('/api/v1/auth/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
    });
    expect(response.text).not.toContain('127.0.0.1');
    expect(response.text).not.toContain('ECONNREFUSED');
    expect(response.text).not.toContain('at ');
  });

  it('FR-SYS-001: an unreachable auth service is logged server-side', async () => {
    const error = vi.fn();
    await request(createApp(testConfig({ logger: { info: vi.fn(), error } }))).get(
      '/api/v1/auth/health',
    );
    expect(error).toHaveBeenCalledWith({ err: expect.any(Error) }, 'Proxy error');
  });
});
