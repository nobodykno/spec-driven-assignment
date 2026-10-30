import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

// NFR-OBS-001: one JSON line per request with the request id propagated from the gateway.
export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const started = Date.now();
    const header = req.headers['x-request-id'];
    const requestId = typeof header === 'string' && header ? header : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      const userId = req.headers['x-user-id'];
      logger.info({
        requestId,
        userId: typeof userId === 'string' ? userId : undefined,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - started,
      });
    });
    next();
  };
}
