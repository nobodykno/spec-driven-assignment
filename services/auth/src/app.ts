import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import type { AuthConfig } from './config.js';
import { createAuthController } from './controllers/auth.js';
import { createLogger } from './logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requireInternalIdentity } from './middleware/internal-identity.js';
import { requestLogger } from './middleware/request-logger.js';
import { authRouter } from './routes/auth.js';
import { healthRouter } from './routes/health.js';
import { AuthService } from './services/auth-service.js';

export interface AppDependencies {
  checkDatabase: () => Promise<boolean>;
  config: AuthConfig;
  logger?: Logger;
  authService?: AuthService;
}

export function createApp(deps: AppDependencies): Express {
  const logger = deps.logger ?? createLogger('auth');
  const service = deps.authService ?? new AuthService(deps.config);
  const controller = createAuthController(service, deps.config.secureCookies);

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(requestLogger(logger));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(healthRouter(deps.checkDatabase));
  app.use(authRouter(controller, requireInternalIdentity(deps.config.internalToken)));

  app.use(notFoundHandler);
  app.use(errorHandler(logger));
  return app;
}
