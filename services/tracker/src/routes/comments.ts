import { Router } from 'express';
import type { CommentController } from '../controllers/comments.js';

// Mounted at /comments (SDS §6.2).
export function commentsRouter(controller: CommentController): Router {
  const router = Router();
  router.patch('/:commentId', controller.edit);
  router.delete('/:commentId', controller.remove);
  return router;
}

// Mounted at /tasks/:taskId/comments.
export function taskCommentsRouter(controller: CommentController): Router {
  const router = Router({ mergeParams: true });
  router.get('/', controller.list);
  router.post('/', controller.add);
  return router;
}

// Mounted at /tasks/:taskId/activity. Read-only: activity has no write routes (FR-ACT-001).
export function taskActivityRouter(controller: CommentController): Router {
  const router = Router({ mergeParams: true });
  router.get('/', controller.activity);
  return router;
}
