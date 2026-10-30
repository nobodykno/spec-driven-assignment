import express, { type Express } from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { healthRouter } from './routes/health.js';

export interface AppDependencies {
  checkDatabase: () => Promise<boolean>;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use(healthRouter(deps.checkDatabase));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
