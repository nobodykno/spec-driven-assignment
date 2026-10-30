import type { User } from '@app/shared';
import { useSyncExternalStore } from 'react';

// SDS §7.2: the access token lives in memory only, never in localStorage.
export type AuthState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'authenticated'; accessToken: string; user: User };

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();

function publish(next: AuthState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const authStore = {
  getState: (): AuthState => state,
  getAccessToken: (): string | null =>
    state.status === 'authenticated' ? state.accessToken : null,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setSession: (accessToken: string, user: User): void =>
    publish({ status: 'authenticated', accessToken, user }),
  setAccessToken: (accessToken: string): void => {
    if (state.status === 'authenticated') {
      publish({ ...state, accessToken });
    }
  },
  clear: (): void => publish({ status: 'guest' }),
  reset: (): void => publish({ status: 'loading' }),
};

export function useAuthState(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.getState);
}
