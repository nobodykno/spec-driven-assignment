import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { testConfig } from './test-support.js';

describe('gateway health', () => {
  it('FR-SYS-001: GET /health returns 200 ok', async () => {
    const response = await request(createApp(testConfig())).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('FR-SYS-002: GET /api/v1/health returns 200 ok', async () => {
    const response = await request(createApp(testConfig())).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('FR-SYS-001: GET /health is 200 while auth is down', async () => {
    const app = createApp(testConfig());
    const authRoute = await request(app).get('/api/v1/auth/health');
    const health = await request(app).get('/health');
    expect(authRoute.status).toBe(503);
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });
});

describe('gateway errors', () => {
  it('FR-SYS-001: unknown path returns 404 NOT_FOUND', async () => {
    const response = await request(createApp(testConfig())).get('/healthz');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('FR-SYS-002: unknown /api/v1 path returns 404 NOT_FOUND', async () => {
    const response = await request(createApp(testConfig())).get('/api/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(typeof response.body.error.message).toBe('string');
  });
});
