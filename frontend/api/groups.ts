import client from './client';

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface PaginatedMessages {
  messages: GroupMessage[];
  total: number;
}

export const groupsApi = {
  list: () => client.get<Group[]>('/groups'),
  get: (id: string) => client.get<Group>(`/groups/${id}`),
  create: (data: { name: string; description?: string }) => client.post<Group>('/groups', data),
};
