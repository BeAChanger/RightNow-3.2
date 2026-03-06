import client from './client';

export interface UploadResult {
  url: string;
}

export interface UploadAsset {
  id: string;
  url: string;
  kind: string;
  createdAt: string;
}

export const uploadApi = {
  async upload(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await client.post<UploadResult>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async uploadAvatar(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await client.post<UploadResult>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async list(query?: { kind?: string; limit?: number }): Promise<UploadAsset[]> {
    const params: Record<string, string | number> = {};
    if (query?.kind) params.kind = query.kind;
    if (query?.limit != null) params.limit = query.limit;

    const { data } = await client.get<UploadAsset[]>('/upload', { params });
    return Array.isArray(data) ? data : [];
  },
};
