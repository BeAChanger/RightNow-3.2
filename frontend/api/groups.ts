import apiClient from './client';

export interface GroupMember {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface GroupMessage {
  id: number;
  groupId: number;
  userId: number;
  username: string;
  avatar?: string;
  content: string;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  avatar?: string;
  description?: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

export interface PaginatedMessages {
  data: GroupMessage[];
  total: number;
  page: number;
  limit: number;
}

export const groupsApi = {
  list: () => apiClient.get<Group[]>('/groups'),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Group>('/groups', data),

  get: (id: number) => apiClient.get<Group>(`/groups/${id}`),

  update: (id: number, data: { name?: string; description?: string; avatar?: string }) =>
    apiClient.patch<Group>(`/groups/${id}`, data),

  delete: (id: number) => apiClient.delete(`/groups/${id}`),

  members: (id: number) => apiClient.get<GroupMember[]>(`/groups/${id}/members`),

  addMember: (id: number, userId: number) =>
    apiClient.post(`/groups/${id}/members`, { userId }),

  removeMember: (id: number, userId: number) =>
    apiClient.delete(`/groups/${id}/members/${userId}`),

  updateMemberRole: (id: number, userId: number, role: 'admin' | 'member') =>
    apiClient.patch(`/groups/${id}/members/${userId}`, { role }),

  messages: (id: number, page = 1, limit = 20) =>
    apiClient.get<PaginatedMessages>(`/groups/${id}/messages`, { params: { page, limit } }),

  sendMessage: (id: number, content: string) =>
    apiClient.post<GroupMessage>(`/groups/${id}/messages`, { content }),
};
