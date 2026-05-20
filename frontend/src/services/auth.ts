import { apiFetch } from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function apiRegister(email: string, password: string, name: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    token: null,
    body: { email, password, name },
  });
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    token: null,
    body: { email, password },
  });
}

export async function apiGoogleAuth(accessToken: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    token: null,
    body: { accessToken },
  });
}
