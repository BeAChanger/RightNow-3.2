import client from './client';
import type { AuditLog } from '../types';

interface AuditListResponse {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditApi = {
  async list(params?: {
    action?: string;
    actorId?: string;
    start?: string;
    end?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { data } = await client.get<AuditListResponse>('/audit', { params });
    return data;
  },
};
