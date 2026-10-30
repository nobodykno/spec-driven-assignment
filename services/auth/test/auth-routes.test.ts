import { AppError } from '@app/shared';
import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { AuthService } from '../src/services/auth-service.js';

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Ada',
  email: 'ada@example.com',
  role: 'USER' as const,
};
const TOKENS = { accessToken: 'access.jwt', expiresIn: 900 };
const IDENTITY = { 'x-internal-token': 'internal', 'x-user-id': USER.id, 'x-user-role': 'USER' };

function build(overrides: Partial<Record<keyof AuthService, unknown>> = {}): {
  app: ReturnType<typeof createApp>;
  service: Record<string, ReturnType<typeof vi.fn>>;
} {
  const service = {
    register: vi.fn().mockResolvedValue(USER),
    login: vi.fn().mockResolvedValue({ tokens: TOKENS, refreshToken: 'raw-refresh', user: USER }),
    refresh: vi.fn().mockResolvedValue({ tokens: TOKENS, refreshToken: 'new-refresh' }),
    logout: vi.fn().mockResolvedValue(undefined),
    me: vi.fn().mockResolvedValue(USER),
    ...overrides,
  };
  const app = createApp({
    checkDatabase: async () => true,
    config: { jwtSecret: 's', internalToken: 'internal', secureCookies: false },
    logger: pino({ level: 'silent' }),
    authService: service as unknown as AuthService,
  });
  return { app, service };
}

describe('POST /register', () => {
  it('FR-AUTH-001: returns 201 with the user and no password', async () => {
    const { app } = build();
    const response = await request(app)
      .post('/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'abcdefg1' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual(USER);
    expect(response.text).not.toContain('abcdefg1');
  });

  it('FR-AUTH-001: returns 400 VALIDATION_ERROR with field details', async () => {
    const response = await request(build().app).post('/register').send({ email: 'nope' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it('FR-AUTH-001: returns 409 EMAIL_TAKEN when the service reports a duplicate', async () => {
    const register = vi.fn().mockRejectedValue(new AppError('EMAIL_TAKEN', 409, 'taken'));
    const response = await request(build({ register }).app)
      .post('/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'abcdefg1' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /login', () => {
  it('FR-AUTH-002: returns the access token and sets an httpOnly refresh cookie', async () => {
    const response = await request(build().app)
      .post('/login')
      .send({ email: 'ada@example.com', password: 'abcdefg1' });
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('access.jwt');
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('refresh_token=raw-refresh');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(response.text).not.toContain('raw-refresh');
  });

  it('FR-AUTH-002: returns 401 INVALID_CREDENTIALS', async () => {
    const login = vi.fn().mockRejectedValue(new AppError('INVALID_CREDENTIALS', 401, 'bad'));
    const response = await request(build({ login }).app)
      .post('/login')
      .send({ email: 'ada@example.com', password: 'x' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /refresh', () => {
  it('FR-AUTH-003: passes the cookie to the service and rotates the cookie', async () => {
    const { app, service } = build();
    const response = await request(app).post('/refresh').set('Cookie', 'refresh_token=old');
    expect(response.status).toBe(200);
    expect(service.refresh).toHaveBeenCalledWith('old');
    expect(String(response.headers['set-cookie'])).toContain('refresh_token=new-refresh');
  });

  it('FR-AUTH-003: returns 401 INVALID_REFRESH_TOKEN for a rejected token', async () => {
    const refresh = vi.fn().mockRejectedValue(new AppError('INVALID_REFRESH_TOKEN', 401, 'bad'));
    const response = await request(build({ refresh }).app).post('/refresh');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /logout and GET /me', () => {
  it('FR-AUTH-004: logout without identity returns 401', async () => {
    const response = await request(build().app).post('/logout');
    expect(response.status).toBe(401);
  });

  it('FR-AUTH-004: logout revokes the cookie token, clears the cookie and returns 204', async () => {
    const { app, service } = build();
    const response = await request(app)
      .post('/logout')
      .set(IDENTITY)
      .set('Cookie', 'refresh_token=old');
    expect(response.status).toBe(204);
    expect(service.logout).toHaveBeenCalledWith(USER.id, 'old');
    expect(String(response.headers['set-cookie'])).toContain('refresh_token=;');
  });

  it('FR-AUTH-007: me returns 401 without a valid internal token', async () => {
    const response = await request(build().app)
      .get('/me')
      .set({ ...IDENTITY, 'x-internal-token': 'wrong' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('FR-AUTH-007: me returns the profile', async () => {
    const response = await request(build().app).get('/me').set(IDENTITY);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(USER);
  });
});
