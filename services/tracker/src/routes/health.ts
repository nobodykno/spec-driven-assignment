import { Router } from 'express';
import { healthController } from '../controllers/health.js';

export function healthRouter(checkDatabase: () => Promise<boolean>): Router {
  const router = Router();
  router.get('/health', healthController(checkDatabase));
  return router;
}
