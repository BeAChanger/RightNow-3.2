import client, { ADMIN_TOKEN_KEY } from './client';
import type { AdminUser } from '../types';

export interface AdminAuthResponse {
  access_token: string;
  user: AdminUser;
}

export const authApi = {
  async login(email: string, password: string): Promise<AdminAuthResponse> {
    const { data } = await client.post<AdminAuthResponse>('/auth/login', {
      email,
      password,
    });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    return data;
  },

  async me(): Promise<AdminUser> {
    const { data } = await client.get<AdminUser>('/auth/me');
    return data;
  },

  logout() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
};
