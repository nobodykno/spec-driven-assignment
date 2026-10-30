import { type JSX, useEffect, useState } from 'react';
import { HealthResponseSchema } from '@app/shared';

type ApiStatus = 'loading' | 'online' | 'offline';

async function fetchApiStatus(signal: AbortSignal): Promise<ApiStatus> {
  try {
    const response = await fetch('/api/v1/health', { signal });
    if (!response.ok) {
      return 'offline';
    }
    const result = HealthResponseSchema.safeParse(await response.json());
    return result.success && result.data.status === 'ok' ? 'online' : 'offline';
  } catch {
    return 'offline';
  }
}

export function App(): JSX.Element {
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');

  useEffect(() => {
    // Abort on unmount so StrictMode's second effect run doesn't race the first.
    const controller = new AbortController();
    void fetchApiStatus(controller.signal).then((status) => {
      if (!controller.signal.aborted) {
        setApiStatus(status);
      }
    });
    return () => controller.abort();
  }, []);

  if (apiStatus === 'loading') {
    return <div role="status">Checking API…</div>;
  }

  return <div role="status">API: {apiStatus}</div>;
}
