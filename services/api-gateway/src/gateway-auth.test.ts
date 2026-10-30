import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { TEST_INTERNAL_TOKEN, TEST_JWT_SECRET, testConfig } from './test-support.js';

const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Seen {
  url: string;
  headers: Record<string, string | string[] | undefined>;
}

let upstream: Server;
let upstreamUrl: string;
let lastSeen: Seen | undefined;

function token(overrides: { expiresIn?: number; secret?: string } = {}): string {
  return jwt.sign({ role: 'USER' }, overrides.secret ?? TEST_JWT_SECRET, {
    subject: USER_ID,
    expiresIn: overrides.expiresIn ?? 900,
  });
}

function appUnderTest(): ReturnType<typeof createApp> {
  return createApp(testConfig({ authServiceUrl: upstreamUrl, trackerServiceUrl: upstreamUrl }));
}

beforeAll(async () => {
  const echo = express();
  echo.use((req, res) => {
    lastSeen = { url: req.url, headers: req.headers };
    res.status(req.url === '/login' ? 401 : 200).json({ ok: true });
  });
  upstream = await new Promise<Server>((resolve) => {
    const server = echo.listen(0, '127.0.0.1', () => resolve(server));
  });
  upstreamUrl = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => upstream.close(() => resolve()));
});

describe('gateway authentication', () => {
  it('FR-AUTH-005: a protected route without a token returns 401 UNAUTHORIZED', async () => {
    const response = await request(appUnderTest()).get('/api/v1/projects');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('FR-AUTH-005: an invalid or expired token returns 401 UNAUTHORIZED', async () => {
    const app = appUnderTest();
    const bad = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token({ secret: 'other' })}`);
    const expired = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${token({ expiresIn: -10 })}`);
    expect(bad.status).toBe(401);
    expect(expired.status).toBe(401);
  });

  it('FR-AUTH-005: a valid token is forwarded with identity headers to the tracker path', async () => {
    const response = await request(appUnderTest())
      .get('/api/v1/projects?includeArchived=true')
      .set('Authorization', `Bearer ${token()}`);
    expect(response.status).toBe(200);
    expect(lastSeen?.url).toBe('/projects?includeArchived=true');
    expect(lastSeen?.headers['x-user-id']).toBe(USER_ID);
    expect(lastSeen?.headers['x-user-role']).toBe('USER');
    expect(lastSeen?.headers['x-internal-token']).toBe(TEST_INTERNAL_TOKEN);
    expect(lastSeen?.headers['x-request-id']).toBeTruthy();
  });

  it('FR-AUTH-005: client supplied identity headers are dropped on public routes', async () => {
    await request(appUnderTest())
      .post('/api/v1/auth/refresh')
      .set({ 'X-User-Id': 'attacker', 'X-Internal-Token': 'guess' });
    expect(lastSeen?.url).toBe('/refresh');
    expect(lastSeen?.headers['x-user-id']).toBeUndefined();
    expect(lastSeen?.headers['x-internal-token']).toBeUndefined();
  });

  it('FR-AUTH-005: register, login and refresh need no token', async () => {
    const app = appUnderTest();
    expect((await request(app).post('/api/v1/auth/register')).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/refresh')).status).toBe(200);
  });
});

describe('gateway rate limits', () => {
  it('FR-AUTH-002: the 11th failed login from one IP returns 429 RATE_LIMITED', async () => {
    const app = appUnderTest();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect((await request(app).post('/api/v1/auth/login')).status).toBe(401);
    }
    const blocked = await request(app).post('/api/v1/auth/login');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
