import { type JSX } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthState } from '../lib/auth-store.ts';

function Pending(): JSX.Element {
  return (
    <p aria-live="polite" className="p-6 text-sm text-slate-500">
      Loading…
    </p>
  );
}

// FR-AUTH-005: unauthenticated users are redirected to the login page.
export function ProtectedRoute(): JSX.Element {
  const auth = useAuthState();
  if (auth.status === 'loading') {
    return <Pending />;
  }
  return auth.status === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}

// SDS §9.1: /login and /register are for guests only.
export function GuestRoute(): JSX.Element {
  const auth = useAuthState();
  if (auth.status === 'loading') {
    return <Pending />;
  }
  return auth.status === 'authenticated' ? <Navigate to="/projects" replace /> : <Outlet />;
}
