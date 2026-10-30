import { pino } from 'pino';
import type { GatewayConfig } from './config.js';

export const TEST_JWT_SECRET = 'test-jwt-secret';
export const TEST_INTERNAL_TOKEN = 'test-internal-token';

// Nothing listens on port 1, so a service using this URL is "down".
export const DOWN_URL = 'http://127.0.0.1:1';

export function testConfig(overrides: Partial<GatewayConfig> = {}): GatewayConfig {
  return {
    authServiceUrl: DOWN_URL,
    trackerServiceUrl: DOWN_URL,
    jwtSecret: TEST_JWT_SECRET,
    internalToken: TEST_INTERNAL_TOKEN,
    webOrigin: 'http://localhost:5173',
    logger: pino({ level: 'silent' }),
    ...overrides,
  };
}
