import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from 'pino';

// NFR-OBS-001: the gateway issues the request id, forwards it and logs one line per request.
// A client-supplied X-Request-Id is never trusted.
export function requestContext(logger: Pick<Logger, 'info'>): RequestHandler {
  return (req, res, next) => {
    const started = Date.now();
    const requestId = randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    res.on('finish', () => {
      const userId = req.headers['x-user-id'];
      logger.info({
        requestId,
        userId: typeof userId === 'string' ? userId : undefined,
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Date.now() - started,
      });
    });
    next();
  };
}
