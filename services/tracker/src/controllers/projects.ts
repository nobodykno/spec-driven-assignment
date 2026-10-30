import {
  AddMemberSchema,
  CreateProjectSchema,
  ListProjectsQuerySchema,
  UpdateProjectSchema,
  parseInput,
} from '@app/shared';
import type { RequestHandler } from 'express';
import { readIdentity } from '../middleware/internal-identity.js';
import type { ProjectService } from '../services/project-service.js';
import { uuidParam } from './params.js';

export interface ProjectController {
  create: RequestHandler;
  list: RequestHandler;
  get: RequestHandler;
  update: RequestHandler;
  archive: RequestHandler;
  addMember: RequestHandler;
  removeMember: RequestHandler;
}

export function createProjectController(service: ProjectService): ProjectController {
  return {
    // FR-PROJ-001
    create: async (req, res) => {
      const input = parseInput(CreateProjectSchema, req.body);
      res.status(201).json(await service.create(readIdentity(res).userId, input));
    },
    // FR-PROJ-002
    list: async (req, res) => {
      const query = parseInput(ListProjectsQuerySchema, req.query);
      res.status(200).json(await service.list(readIdentity(res).userId, query.includeArchived));
    },
    get: async (req, res) => {
      res
        .status(200)
        .json(await service.get(readIdentity(res).userId, uuidParam(req, 'projectId')));
    },
    // FR-PROJ-003
    update: async (req, res) => {
      const input = parseInput(UpdateProjectSchema, req.body);
      const id = uuidParam(req, 'projectId');
      res.status(200).json(await service.update(readIdentity(res).userId, id, input));
    },
    // FR-PROJ-004
    archive: async (req, res) => {
      const id = uuidParam(req, 'projectId');
      res.status(200).json(await service.archive(readIdentity(res).userId, id));
    },
    // FR-PROJ-005
    addMember: async (req, res) => {
      const input = parseInput(AddMemberSchema, req.body);
      const id = uuidParam(req, 'projectId');
      res.status(201).json(await service.addMember(readIdentity(res).userId, id, input));
    },
    // FR-PROJ-006
    removeMember: async (req, res) => {
      const id = uuidParam(req, 'projectId');
      await service.removeMember(readIdentity(res).userId, id, uuidParam(req, 'userId'));
      res.status(204).end();
    },
  };
}
