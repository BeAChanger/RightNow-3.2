import client from './client';
import type { ManagedUser, UserStatus } from '../types';

interface UserListResponse {
  items: ManagedUser[];
  total: number;
  page: number;
  pageSize: number;
}

export const usersApi = {
  async list(params: {
    keyword?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<UserListResponse> {
    const { data } = await client.get<UserListResponse>('/users', { params });
    return data;
  },

  async updateStatus(id: string, status: UserStatus): Promise<ManagedUser> {
    const { data } = await client.patch<ManagedUser>(`/users/${id}/status`, { status });
    return data;
  },
};
