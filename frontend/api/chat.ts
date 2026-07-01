import client from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface PaginatedChat {
  data: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

export interface SendChatPayload {
  content: string;
  systemPrompt?: string;
}

export const chatApi = {
  async history(page = 1, limit = 20): Promise<PaginatedChat> {
    const { data } = await client.get<PaginatedChat>('/chat', { params: { page, limit } });
    return data;
  },

  /** Poll for messages created after `since` (ISO string). Returns up to 50. */
  async poll(since: string): Promise<PaginatedChat> {
    const { data } = await client.get<PaginatedChat>('/chat', { params: { since } });
    return data;
  },

  async send(payloadOrContent: SendChatPayload | string): Promise<ChatMessage> {
    const body: SendChatPayload =
      typeof payloadOrContent === 'string' ? { content: payloadOrContent } : payloadOrContent;
    const { data } = await client.post<ChatMessage>('/chat', body);
    return data;
  },

  /** Trigger a proactive push (persists + delivers to all bound channels). */
  async push(text: string): Promise<ChatMessage> {
    const { data } = await client.post<ChatMessage>('/chat/push', { text });
    return data;
  },
};

export interface WechatBindCode {
  code: string;
  expiresAt: string;
}

export interface WechatBindingInfo {
  peerId: string;
  botAccountId: string | null;
  source: string;
  createdAt: string;
}

export const wechatApi = {
  async generateBindCode(): Promise<WechatBindCode> {
    const { data } = await client.post<WechatBindCode>('/wechat/bind/code', {});
    return data;
  },
  async getBinding(): Promise<WechatBindingInfo | null> {
    const { data } = await client.get<WechatBindingInfo | null>('/wechat/binding');
    return data;
  },
  async unbind(): Promise<{ ok: boolean }> {
    const { data } = await client.delete<{ ok: boolean }>('/wechat/binding');
    return data;
  },
};

