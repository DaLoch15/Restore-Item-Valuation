import { apiClient } from './client';
import type { User, AuthResponse, RegisterRequest, LoginRequest } from 'shared';

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/register', data);
  return response.data;
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>('/auth/login', data);
  return response.data;
}

export async function refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
  const response = await apiClient.post<{ accessToken: string }>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const response = await apiClient.get<{ user: User }>('/auth/me');
  return response.data;
}
