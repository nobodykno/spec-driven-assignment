import type { Logger } from 'pino';

export interface GatewayConfig {
  authServiceUrl: string;
  trackerServiceUrl: string;
  jwtSecret: string;
  internalToken: string;
  webOrigin: string;
  logger?: Pick<Logger, 'info' | 'error'>;
}

function requireVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

// NFR-SEC-005: secrets come only from the environment.
export function loadConfig(): GatewayConfig {
  return {
    authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
    trackerServiceUrl: process.env.TRACKER_SERVICE_URL ?? 'http://localhost:4002',
    jwtSecret: requireVariable('JWT_SECRET'),
    internalToken: requireVariable('INTERNAL_TOKEN'),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  };
}
