import {
  AssignTaskSchema,
  ChangeStatusSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  parseInput,
} from '@app/shared';
import type { RequestHandler } from 'express';
import { readIdentity } from '../middleware/internal-identity.js';
import type { TaskService } from '../services/task-service.js';
import { uuidParam } from './params.js';

export interface TaskController {
  create: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  assign: RequestHandler;
  changeStatus: RequestHandler;
  archive: RequestHandler;
}

export function createTaskController(service: TaskService): TaskController {
  return {
    // FR-TASK-001
    create: async (req, res) => {
      const input = parseInput(CreateTaskSchema, req.body);
      const projectId = uuidParam(req, 'projectId');
      res.status(201).json(await service.create(readIdentity(res).userId, projectId, input));
    },
    // FR-TASK-002
    get: async (req, res) => {
      const taskId = uuidParam(req, 'taskId');
      res.status(200).json(await service.get(readIdentity(res).userId, taskId));
    },
    // FR-TASK-003
    update: async (req, res) => {
      const input = parseInput(UpdateTaskSchema, req.body);
      const taskId = uuidParam(req, 'taskId');
      res.status(200).json(await service.update(readIdentity(res).userId, taskId, input));
    },
    // FR-TASK-004
    assign: async (req, res) => {
      const input = parseInput(AssignTaskSchema, req.body);
      const taskId = uuidParam(req, 'taskId');
      const task = await service.assign(readIdentity(res).userId, taskId, input.assigneeId);
      res.status(200).json(task);
    },
    // FR-TASK-005
    changeStatus: async (req, res) => {
      const input = parseInput(ChangeStatusSchema, req.body);
      const taskId = uuidParam(req, 'taskId');
      const task = await service.changeStatus(readIdentity(res).userId, taskId, input.status);
      res.status(200).json(task);
    },
    // FR-TASK-006
    archive: async (req, res) => {
      const taskId = uuidParam(req, 'taskId');
      res.status(200).json(await service.archive(readIdentity(res).userId, taskId));
    },
  };
}
