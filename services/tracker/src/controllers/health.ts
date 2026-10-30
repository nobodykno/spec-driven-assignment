import type { HealthResponse } from '@app/shared';
import type { RequestHandler } from 'express';

// FR-SYS-001: 200 when the database is reachable, 503 otherwise.
export function healthController(checkDatabase: () => Promise<boolean>): RequestHandler {
  return async (_req, res) => {
    const healthy = await checkDatabase();
    const body: HealthResponse = { status: healthy ? 'ok' : 'error' };
    res.status(healthy ? 200 : 503).json(body);
  };
}
