import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

// Nothing listens on port 1, so the auth service is "down".
const AUTH_DOWN = 'http://127.0.0.1:1';

describe('gateway health', () => {
  it('FR-SYS-001: GET /health returns 200 ok', async () => {
    const response = await request(createApp({ authServiceUrl: AUTH_DOWN })).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('FR-SYS-002: GET /api/v1/health returns 200 ok', async () => {
    const response = await request(createApp({ authServiceUrl: AUTH_DOWN })).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('FR-SYS-001: GET /health is 200 while auth is down', async () => {
    const app = createApp({ authServiceUrl: AUTH_DOWN });
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('gateway errors', () => {
  it('FR-SYS-002: unknown /api/v1 path returns 404 NOT_FOUND', async () => {
    const response = await request(createApp({ authServiceUrl: AUTH_DOWN })).get(
      '/api/v1/does-not-exist',
    );
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(typeof response.body.error.message).toBe('string');
  });
});
