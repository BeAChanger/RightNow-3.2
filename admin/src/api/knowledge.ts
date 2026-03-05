import client from './client';
import type { KnowledgeSource } from '../types';

interface SourceListResponse {
  items: KnowledgeSource[];
}

export const knowledgeApi = {
  async listSources(): Promise<SourceListResponse> {
    const { data } = await client.get<SourceListResponse>('/knowledge/sources');
    return data;
  },

  async upload(file: File, domain: string) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await client.post('/knowledge/upload', formData, {
      params: { domain },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  async deleteSource(sourceName: string) {
    const { data } = await client.delete(`/knowledge/sources/${encodeURIComponent(sourceName)}`);
    return data;
  },

  async rescan(force: boolean) {
    const { data } = await client.post('/knowledge/rescan', null, {
      params: { force },
    });
    return data;
  },
};
