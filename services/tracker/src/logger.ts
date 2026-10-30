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
];

export function createLogger(name: string, level = process.env.LOG_LEVEL ?? 'info'): Logger {
  return pino({ name, level, redact: { paths: REDACT_PATHS, censor: '[Redacted]' } });
}
