import { type RouteObject } from 'react-router';
import { ProjectPage } from '../features/tasks/pages/project-page.tsx';
import { TaskDetailPage } from '../features/tasks/pages/task-detail-page.tsx';

// SDS §9.1: project detail with the task list, and the task page. Both need authentication.
export const taskRoutes: RouteObject[] = [
  { path: '/projects/:projectId', element: <ProjectPage /> },
  { path: '/tasks/:taskId', element: <TaskDetailPage /> },
];
