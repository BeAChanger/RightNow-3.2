import apiClient from './client';

export interface ImageGenTask {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  sourceImageUrl?: string;
  targetStyle?: string;
  prompt?: string;
  resultImageUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface IdealBodyGeneratePayload {
  prompt: string;
  currentImageBase64?: string;
  referenceImageBase64?: string;
  size?: string;
}

export interface IdealBodyGenerateResult {
  image: string;
  taskId?: string | null;
}

export const imageGenApi = {
  create: (data: { sourceImageUrl?: string; targetStyle?: string; prompt?: string }) =>
    apiClient.post<ImageGenTask>('/image-gen', data).then(r => r.data),

  list: () =>
    apiClient.get<ImageGenTask[]>('/image-gen').then(r => r.data),

  get: (id: string) =>
    apiClient.get<ImageGenTask>(`/image-gen/${id}`).then(r => r.data),

  updateStatus: (id: string, data: { status: string; resultImageUrl?: string }) =>
    apiClient.patch<ImageGenTask>(`/image-gen/${id}`, data).then(r => r.data),

  generateIdealBody: (data: IdealBodyGeneratePayload) =>
    apiClient.post<IdealBodyGenerateResult>('/image-gen/ideal-body', data, {
      timeout: 120_000,
    }).then(r => r.data),
};
