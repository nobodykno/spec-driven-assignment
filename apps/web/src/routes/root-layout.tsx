import { type JSX } from 'react';
import { Link, Outlet } from 'react-router';
import { ApiStatus } from '../components/api-status.tsx';
import { Button } from '../components/ui/button.tsx';
import { useLogoutMutation } from '../features/auth/api/auth-api.ts';
import { useAuthState } from '../lib/auth-store.ts';

function UserMenu(): JSX.Element | null {
  const auth = useAuthState();
  const logout = useLogoutMutation();
  if (auth.status !== 'authenticated') {
    return null;
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{auth.user.name}</span>
      <Button variant="outline" size="sm" onClick={() => logout.mutate()}>
        Log out
      </Button>
    </div>
  );
}

// Header with the API indicator (FR-SYS-002) and the signed-in user (FR-UI-001).
export function RootLayout(): JSX.Element {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <Link to="/projects" className="font-semibold">
          Team Task Tracker
        </Link>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <ApiStatus />
          <UserMenu />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
