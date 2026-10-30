import { type JSX } from 'react';
import { Navigate, useRoutes, type RouteObject } from 'react-router';
import { LoginPage } from '../features/auth/pages/login-page.tsx';
import { RegisterPage } from '../features/auth/pages/register-page.tsx';
import { ProjectSettingsPage } from '../features/projects/pages/project-settings-page.tsx';
import { ProjectsPage } from '../features/projects/pages/projects-page.tsx';
import { GuestRoute, ProtectedRoute } from './route-guards.tsx';
import { RootLayout } from './root-layout.tsx';

function NotFoundPage(): JSX.Element {
  return <p className="p-6">Page not found.</p>;
}

// SDS §9.1. Later tickets add their routes to the protected children list.
export const appRoutes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <GuestRoute />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId/settings', element: <ProjectSettingsPage /> },
        ],
      },
      { path: '/', element: <Navigate to="/projects" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function AppRoutes(): JSX.Element | null {
  return useRoutes(appRoutes);
}
