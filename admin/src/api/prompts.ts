import client from './client';
import type { PromptBinding, PromptTemplate } from '../types';

interface PromptListResponse {
  items: PromptTemplate[];
  total: number;
  page: number;
  pageSize: number;
}

export const promptsApi = {
  async list(params?: { keyword?: string; scene?: string; enabled?: string }) {
    const { data } = await client.get<PromptListResponse>('/prompts', { params });
    return data;
  },

  async listBindings() {
    const { data } = await client.get<PromptBinding[]>('/prompts/bindings');
    return data;
  },

  async create(payload: {
    key: string;
    scene: string;
    content: string;
    variables?: string[];
    enabled?: boolean;
  }) {
    const { data } = await client.post<PromptTemplate>('/prompts', payload);
    return data;
  },

  async update(
    id: string,
    payload: {
      key?: string;
      scene?: string;
      content?: string;
      variables?: string[];
      enabled?: boolean;
    },
  ) {
    const { data } = await client.put<PromptTemplate>(`/prompts/${id}`, payload);
    return data;
  },

  async remove(id: string) {
    const { data } = await client.delete<{ deleted: boolean }>(`/prompts/${id}`);
    return data;
  },

  async test(id: string, variables: Record<string, unknown>) {
    const { data } = await client.post<{
      templateId: string;
      prompt: string;
      missingVariables: string[];
    }>(`/prompts/${id}/test`, { variables });
    return data;
  },
};