import { Router } from 'express';
import type { TaskController } from '../controllers/tasks.js';

// SDS §6.2 task endpoints; mounted at /tasks.
export function tasksRouter(controller: TaskController): Router {
  const router = Router();
  router.get('/:taskId', controller.get);
  router.patch('/:taskId', controller.update);
  router.patch('/:taskId/assignee', controller.assign);
  router.patch('/:taskId/status', controller.changeStatus);
  router.post('/:taskId/archive', controller.archive);
  return router;
}

// Mounted at /projects/:projectId/tasks; the list route is added by DEV-12.
export function projectTasksRouter(controller: TaskController): Router {
  const router = Router({ mergeParams: true });
  router.post('/', controller.create);
  return router;
}
