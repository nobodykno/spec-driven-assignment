import { Router } from 'express';
import type { ProjectController } from '../controllers/projects.js';

// SDS §6.2 project endpoints; mounted at /projects.
export function projectsRouter(controller: ProjectController): Router {
  const router = Router();
  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:projectId', controller.get);
  router.patch('/:projectId', controller.update);
  router.post('/:projectId/archive', controller.archive);
  router.post('/:projectId/members', controller.addMember);
  router.delete('/:projectId/members/:userId', controller.removeMember);
  return router;
}
