import { Router, type RequestHandler } from 'express';
import type { AuthController } from '../controllers/auth.js';

// SDS §6.2: mounted at the root; the gateway strips /api/v1/auth.
export function authRouter(controller: AuthController, identity: RequestHandler): Router {
  const router = Router();
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', identity, controller.logout);
  router.get('/me', identity, controller.me);
  return router;
}
