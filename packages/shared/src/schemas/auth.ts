import { z } from 'zod';
import { UuidSchema } from './common.js';

export const SystemRoleSchema = z.enum(['USER', 'ADMIN']);
export type SystemRole = z.infer<typeof SystemRoleSchema>;

// FR-AUTH-001: at least 8 characters with a letter and a number.
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email().max(255),
  password: PasswordSchema,
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// FR-AUTH-001 / FR-AUTH-007: never includes the password or its hash.
export const UserSchema = z.object({
  id: UuidSchema,
  name: z.string(),
  email: z.string(),
  role: SystemRoleSchema,
});

export type User = z.infer<typeof UserSchema>;

export const RegisterResponseSchema = UserSchema;

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

export const LoginResponseSchema = TokenResponseSchema.extend({ user: UserSchema });

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// SDS §7.2: claims of the access JWT.
export const AccessTokenClaimsSchema = z.object({
  sub: UuidSchema,
  role: SystemRoleSchema,
  iat: z.number().int(),
  exp: z.number().int(),
});

export type AccessTokenClaims = z.infer<typeof AccessTokenClaimsSchema>;

// SDS §7.2 / §6.2 token lifetimes.
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
