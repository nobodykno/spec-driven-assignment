import {
  LoginResponseSchema,
  RegisterResponseSchema,
  UserSchema,
  type LoginInput,
  type LoginResponse,
  type RegisterInput,
  type User,
} from '@app/shared';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiFetch, apiRequest, refreshAccessToken } from '../../../lib/api-client.ts';
import { authStore } from '../../../lib/auth-store.ts';

export function useLoginMutation(): UseMutationResult<LoginResponse, Error, LoginInput> {
  return useMutation({
    mutationFn: (input: LoginInput) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: input,
        parser: LoginResponseSchema,
        skipRefresh: true,
      }),
    onSuccess: (result) => authStore.setSession(result.accessToken, result.user),
  });
}

export function useRegisterMutation(): UseMutationResult<User, Error, RegisterInput> {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      apiFetch('/auth/register', {
        method: 'POST',
        body: input,
        parser: RegisterResponseSchema,
        skipRefresh: true,
      }),
  });
}

// FR-UI-001: logout always ends the local session, even if the server call fails.
export function useLogoutMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      authStore.clear();
      queryClient.clear();
    },
  });
}

// FR-UI-002: restore the session after a reload from the refresh cookie.
export async function bootstrapSession(): Promise<void> {
  const token = await refreshAccessToken();
  if (!token) {
    authStore.clear();
    return;
  }
  try {
    const user = await apiFetch('/auth/me', {
      parser: UserSchema,
      skipRefresh: true,
      token,
    });
    authStore.setSession(token, user);
  } catch {
    authStore.clear();
  }
}
