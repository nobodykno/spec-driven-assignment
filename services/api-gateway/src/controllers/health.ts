import type { HealthResponse } from '@app/shared';
import type { RequestHandler } from 'express';

// The gateway reports only its own process status (FR-SYS-001, FR-SYS-002).
export const healthController: RequestHandler = (_req, res) => {
  const body: HealthResponse = { status: 'ok' };
  res.status(200).json(body);
};
