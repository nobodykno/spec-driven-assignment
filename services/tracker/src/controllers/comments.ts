import {
  CreateCommentSchema,
  ListActivityQuerySchema,
  ListCommentsQuerySchema,
  UpdateCommentSchema,
  parseInput,
} from '@app/shared';
import type { RequestHandler } from 'express';
import { readIdentity } from '../middleware/internal-identity.js';
import type { ActivityService } from '../services/activity-service.js';
import type { CommentService } from '../services/comment-service.js';
import { uuidParam } from './params.js';

export interface CommentController {
  add: RequestHandler;
  list: RequestHandler;
  edit: RequestHandler;
  remove: RequestHandler;
  activity: RequestHandler;
}

export function createCommentController(
  comments: CommentService,
  activity: ActivityService,
): CommentController {
  return {
    // FR-CMT-001
    add: async (req, res) => {
      const input = parseInput(CreateCommentSchema, req.body);
      const taskId = uuidParam(req, 'taskId');
      res.status(201).json(await comments.add(readIdentity(res).userId, taskId, input.body));
    },
    // FR-CMT-004
    list: async (req, res) => {
      const query = parseInput(ListCommentsQuerySchema, req.query);
      const taskId = uuidParam(req, 'taskId');
      res.status(200).json(await comments.list(readIdentity(res).userId, taskId, query));
    },
    // FR-CMT-002
    edit: async (req, res) => {
      const input = parseInput(UpdateCommentSchema, req.body);
      const commentId = uuidParam(req, 'commentId');
      res.status(200).json(await comments.edit(readIdentity(res).userId, commentId, input.body));
    },
    // FR-CMT-003
    remove: async (req, res) => {
      await comments.remove(readIdentity(res).userId, uuidParam(req, 'commentId'));
      res.status(204).end();
    },
    // FR-ACT-002
    activity: async (req, res) => {
      const query = parseInput(ListActivityQuerySchema, req.query);
      const taskId = uuidParam(req, 'taskId');
      res.status(200).json(await activity.listForTask(readIdentity(res).userId, taskId, query));
    },
  };
}
