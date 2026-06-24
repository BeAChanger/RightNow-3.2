import client from './client';

export interface Friendship {
  id: string;
  user: { id: string; name: string; avatar?: string };
  status: 'pending' | 'accepted';
  createdAt: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asFriendUser(value: unknown): { id: string; name: string; avatar?: string } | null {
  const obj = asObject(value);
  if (!obj) {
    return null;
  }

  const id = typeof obj.id === 'string' ? obj.id : null;
  const name = typeof obj.name === 'string' ? obj.name : null;
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    avatar: typeof obj.avatar === 'string' ? obj.avatar : undefined,
  };
}

function normalizeFriendship(payload: unknown): Friendship | null {
  const obj = asObject(payload);
  if (!obj || typeof obj.id !== 'string') {
    return null;
  }

  const user = asFriendUser(obj.user) || asFriendUser(obj.friend);
  if (!user) {
    return null;
  }

  const status = obj.status === 'accepted' ? 'accepted' : 'pending';
  const createdAt =
    typeof obj.createdAt === 'string'
      ? obj.createdAt
      : new Date().toISOString();

  return {
    id: obj.id,
    user,
    status,
    createdAt,
  };
}

function normalizeFriendshipList(payload: unknown): Friendship[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeFriendship(item))
      .filter((item): item is Friendship => item !== null);
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const candidates = [obj.data, obj.items, obj.friends];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    return candidate
      .map((item) => normalizeFriendship(item))
      .filter((item): item is Friendship => item !== null);
  }

  const single = normalizeFriendship(obj);
  return single ? [single] : [];
}

export interface BuddyRecommendation {
  userId: string;
  name: string;
  avatar?: string;
  matchScore: number;
  reason: string;
}

function normalizeRecommendation(payload: unknown): BuddyRecommendation | null {
  const obj = asObject(payload);
  if (!obj) return null;

  const userId = typeof obj.userId === 'string' ? obj.userId : null;
  const name = typeof obj.name === 'string' ? obj.name : null;
  const matchScore = typeof obj.matchScore === 'number' ? obj.matchScore : 0;
  const reason = typeof obj.reason === 'string' ? obj.reason : '';

  if (!userId || !name) return null;

  return {
    userId,
    name,
    avatar: typeof obj.avatar === 'string' ? obj.avatar : undefined,
    matchScore,
    reason,
  };
}

export const friendshipsApi = {
  async list(): Promise<Friendship[]> {
    const { data } = await client.get<unknown>('/friendships');
    return normalizeFriendshipList(data);
  },

  async request(receiverId: string): Promise<Friendship> {
    const { data } = await client.post<unknown>('/friendships/request', { receiverId });
    const normalized = normalizeFriendship(data);
    if (!normalized) {
      throw new Error('Invalid friendship response payload');
    }
    return normalized;
  },

  async accept(id: string): Promise<Friendship> {
    const { data } = await client.patch<unknown>(`/friendships/${id}/accept`);
    const normalized = normalizeFriendship(data);
    if (!normalized) {
      throw new Error('Invalid friendship response payload');
    }
    return normalized;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/friendships/${id}`);
  },

  async getRecommendations(): Promise<BuddyRecommendation[]> {
    const { data } = await client.get<unknown>('/friendships/recommendations');
    if (!Array.isArray(data)) return [];
    return data.map(normalizeRecommendation).filter((r): r is BuddyRecommendation => r !== null);
  },
};
