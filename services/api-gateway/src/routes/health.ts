import { Router } from 'express';
import { healthController } from '../controllers/health.js';

export function healthRouter(): Router {
  const router = Router();
  router.get(['/health', '/api/v1/health'], healthController);
  return router;
}
