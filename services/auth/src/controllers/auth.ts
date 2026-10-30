import {
  LoginSchema,
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  REFRESH_TOKEN_TTL_SECONDS,
  RegisterSchema,
  parseInput,
  type LoginResponse,
  type TokenResponse,
  type User,
} from '@app/shared';
import type { CookieOptions, Request, RequestHandler } from 'express';
import { readIdentity } from '../middleware/internal-identity.js';
import type { AuthService } from '../services/auth-service.js';

function cookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: REFRESH_COOKIE_PATH };
}

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value ? value : undefined;
}

export interface AuthController {
  register: RequestHandler;
  login: RequestHandler;
  refresh: RequestHandler;
  logout: RequestHandler;
  me: RequestHandler;
}

export function createAuthController(service: AuthService, secureCookies: boolean): AuthController {
  const setCookie = (res: Parameters<RequestHandler>[1], token: string): void => {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      ...cookieOptions(secureCookies),
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  };

  return {
    // FR-AUTH-001
    register: async (req, res) => {
      const user: User = await service.register(parseInput(RegisterSchema, req.body));
      res.status(201).json(user);
    },
    // FR-AUTH-002
    login: async (req, res) => {
      const result = await service.login(parseInput(LoginSchema, req.body));
      setCookie(res, result.refreshToken);
      const body: LoginResponse = { ...result.tokens, user: result.user };
      res.status(200).json(body);
    },
    // FR-AUTH-003
    refresh: async (req, res) => {
      const session = await service.refresh(readRefreshCookie(req));
      setCookie(res, session.refreshToken);
      const body: TokenResponse = session.tokens;
      res.status(200).json(body);
    },
    // FR-AUTH-004
    logout: async (req, res) => {
      await service.logout(readIdentity(res).userId, readRefreshCookie(req));
      res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(secureCookies));
      res.status(204).end();
    },
    // FR-AUTH-007
    me: async (_req, res) => {
      res.status(200).json(await service.me(readIdentity(res).userId));
    },
  };
}
