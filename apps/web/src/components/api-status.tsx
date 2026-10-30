import { HealthResponseSchema } from '@app/shared';
import { type JSX, useEffect, useState } from 'react';

type ApiStatusValue = 'loading' | 'online' | 'offline';

async function fetchApiStatus(signal: AbortSignal): Promise<ApiStatusValue> {
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

// FR-SYS-002: the only element with role="status" in the app.
export function ApiStatus(): JSX.Element {
  const [apiStatus, setApiStatus] = useState<ApiStatusValue>('loading');

  useEffect(() => {
    // Abort on unmount so StrictMode's second effect run doesn't race the first.
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      const status = await fetchApiStatus(controller.signal);
      if (!controller.signal.aborted) {
        setApiStatus(status);
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  if (apiStatus === 'loading') {
    return <div role="status">Checking API…</div>;
  }
  return <div role="status">API: {apiStatus}</div>;
}
