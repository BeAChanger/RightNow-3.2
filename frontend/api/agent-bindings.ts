import client, { getApiErrorMessage } from './client';

export interface AgentBinding {
  id: string;
  channel: string;
  displayName?: string;
  status: string;
  lastSeenAt?: string;
  createdAt: string;
}

export interface BindCodeResult {
  code: string;
  expiresAt: string;
}

export const agentBindingsApi = {
  async generateCode(): Promise<BindCodeResult> {
    const res = await client.post('/agent/bindings/code');
    return res.data;
  },

  async list(): Promise<AgentBinding[]> {
    const res = await client.get('/agent/bindings');
    return res.data;
  },

  async revoke(id: string): Promise<{ revoked: boolean }> {
    const res = await client.delete(`/agent/bindings/${id}`);
    return res.data;
  },

  async getErrorMessage(error: unknown): Promise<string> {
    return getApiErrorMessage(error, '绑定操作失败，请稍后重试');
  },
};
