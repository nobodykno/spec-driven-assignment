import { pino, type Logger } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from './app.js';

const config = { jwtSecret: 'test-secret', internalToken: 'internal', secureCookies: false };
const silentLogger = pino({ level: 'silent' });

const appWithDatabase = (
  checkDatabase: () => Promise<boolean>,
  logger: Pick<Logger, 'error' | 'info'> = silentLogger,
): ReturnType<typeof createApp> => createApp({ checkDatabase, config, logger: logger as Logger });

describe('auth GET /health', () => {
  it('FR-SYS-001: GET /health returns 200 ok when the database is reachable', async () => {
    const response = await request(appWithDatabase(async () => true)).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('FR-SYS-001: GET /health returns 503 error when the database is down', async () => {
    const response = await request(appWithDatabase(async () => false)).get('/health');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'error' });
  });

  it('FR-SYS-001: GET /health recovers once the database is reachable again', async () => {
    const checkDatabase = vi.fn<() => Promise<boolean>>().mockResolvedValueOnce(false);
    checkDatabase.mockResolvedValue(true);
    const app = appWithDatabase(checkDatabase);
    expect((await request(app).get('/health')).status).toBe(503);
    expect((await request(app).get('/health')).status).toBe(200);
  });
});

describe('auth errors', () => {
  it('FR-SYS-001: unknown path returns 404 NOT_FOUND', async () => {
    const response = await request(appWithDatabase(async () => true)).get('/healthz');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(typeof response.body.error.message).toBe('string');
  });

  it('NFR-MNT-001: unexpected error returns 500 INTERNAL_ERROR without stack', async () => {
    const response = await request(
      appWithDatabase(async () => {
        throw new Error('secret connection string leaked');
      }),
    ).get('/health');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.text).not.toContain('secret');
    expect(response.text).not.toContain('at ');
  });

  it('FR-SYS-001: unexpected error is logged server-side', async () => {
    const error = vi.fn();
    const failure = new Error('database driver crashed');
    await request(
      appWithDatabase(
        async () => {
          throw failure;
        },
        { error, info: vi.fn() },
      ),
    ).get('/health');
    expect(error).toHaveBeenCalledWith({ err: failure }, 'Unhandled error');
  });
});
