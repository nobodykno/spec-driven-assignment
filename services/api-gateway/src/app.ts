import { ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { AppError } from '@app/shared';
import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Logger } from 'pino';
import type { GatewayConfig } from './config.js';
import { createLogger } from './logger.js';
import { authenticate } from './middleware/authenticate.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { loginRateLimit, registerRateLimit } from './middleware/rate-limits.js';
import { requestContext } from './middleware/request-context.js';
import { healthRouter } from './routes/health.js';

export type { GatewayConfig } from './config.js';

const TRACKER_RESOURCES = ['projects', 'tasks', 'comments'];

// SDS §10: an unreachable downstream service becomes 503 SERVICE_UNAVAILABLE,
// without the upstream address or error details. The error itself is logged server-side.
function unavailableHandler(logger: Pick<Logger, 'error'>) {
  return (err: Error, _req: unknown, res: ServerResponse | Socket): void => {
    logger.error({ err }, 'Proxy error');
    if (!(res instanceof ServerResponse)) {
      res.destroy();
      return;
    }
    if (res.headersSent) {
      res.end();
      return;
    }
    const body = new AppError('SERVICE_UNAVAILABLE', 503, 'Service unavailable').toResponse();
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
}

function trackerProxy(
  config: GatewayConfig,
  resource: string,
  logger: Pick<Logger, 'error'>,
): RequestHandler {
  // Express strips the mount path; put the resource back for the tracker (/projects/...).
  return createProxyMiddleware({
    target: config.trackerServiceUrl,
    changeOrigin: true,
    pathRewrite: (path) => `/${resource}${path.replace(/^\/(?=$|\?)/, '')}`,
    on: { error: unavailableHandler(logger) },
  });
}

export function createApp(config: GatewayConfig): Express {
  const logger = config.logger ?? createLogger('api-gateway');
  const guard = authenticate({ jwtSecret: config.jwtSecret, internalToken: config.internalToken });
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.webOrigin, credentials: true }));
  app.use(requestContext(logger));

  // Answered by the gateway itself, never proxied (FR-SYS-001, FR-SYS-002).
  app.use(healthRouter());

  app.post('/api/v1/auth/login', loginRateLimit());
  app.post('/api/v1/auth/register', registerRateLimit());

  // No body parser before the proxies: it would consume the request stream.
  app.use(
    '/api/v1/auth',
    guard,
    createProxyMiddleware({
      target: config.authServiceUrl,
      changeOrigin: true,
      on: { error: unavailableHandler(logger) },
    }),
  );
  TRACKER_RESOURCES.forEach((resource) => {
    app.use(`/api/v1/${resource}`, guard, trackerProxy(config, resource, logger));
  });

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
