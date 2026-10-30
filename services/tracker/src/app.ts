import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { TrackerConfig } from './config.js';
import { createLogger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requireInternalIdentity } from './middleware/internal-identity.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRouter } from './routes/health.js';

export interface AppDependencies {
  checkDatabase: () => Promise<boolean>;
  config: TrackerConfig;
  logger?: Logger;
}

export function createApp(deps: AppDependencies): Express {
  const logger = deps.logger ?? createLogger('tracker');
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestLogger(logger));
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(deps.checkDatabase));

  // FR-AUTH-005: everything below needs the identity forwarded by the gateway.
  app.use(requireInternalIdentity(deps.config.internalToken));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
