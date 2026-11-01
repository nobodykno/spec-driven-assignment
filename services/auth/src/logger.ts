import { pino, type Logger } from 'pino';

// SDS §7.4: secrets never reach the logs.
export const REDACT_PATHS = [
  'authorization',
  'cookie',
  'password',
  'token',
  'refreshToken',
  'accessToken',
  '*.authorization',
  '*.cookie',
  '*.password',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  'passwordHash',
  '*.passwordHash',
  '*.*.authorization',
  '*.*.cookie',
  '*.*.password',
  '*.*.passwordHash',
  '*.*.token',
  '*.*.refreshToken',
  '*.*.accessToken',
  '*.headers["x-internal-token"]',
  '*.headers["set-cookie"]',
  '*.*.headers["x-internal-token"]',
  '*.*.headers["set-cookie"]',
];

export function createLogger(name: string, level = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({ name, level, redact: { paths: REDACT_PATHS, censor: '[Redacted]' } });
}
