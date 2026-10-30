import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type JSX, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router';
import { bootstrapSession } from './features/auth/api/auth-api.ts';
import { AppRoutes } from './routes/index.tsx';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
}

export function App(): JSX.Element {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    // FR-UI-002: restore the session from the refresh cookie after a reload.
    void bootstrapSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
