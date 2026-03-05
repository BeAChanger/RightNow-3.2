import client from './client';

export interface PostItem {
  id: string;
  content: string;
  images?: string[];
  tags?: string[];
  author: { id: string; name: string; avatar?: string };
  likes: number;
  liked: boolean;
  commentCount: number;
  createdAt: string;
  visibility?: 'PUBLIC' | 'BUDDIES_ONLY';
  postType?: 'NORMAL' | 'PROGRESS_REPORT';
  aiDraftPayload?: {
    metrics?: {
      trainingCount?: number;
      weightChange?: number;
      streak?: number;
    };
  };
}

export interface Comment {
  id: string;
  content: string;
  author: { id: string; name: string; avatar?: string };
  createdAt: string;
}

export interface PaginatedPosts {
  data: PostItem[];
  total: number;
  page: number;
  limit: number;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizeAuthor(payload: unknown): { id: string; name: string; avatar?: string } | null {
  const obj = asObject(payload);
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

function normalizePostItem(payload: unknown): PostItem | null {
  const obj = asObject(payload);
  if (!obj || typeof obj.id !== 'string') {
    return null;
  }

  const author =
    normalizeAuthor(obj.author) ||
    normalizeAuthor(obj.user) || {
      id: 'unknown',
      name: '鍖垮悕鐢ㄦ埛',
      avatar: undefined,
    };

  const countObj = asObject(obj._count);
  const commentCount =
    typeof obj.commentCount === 'number'
      ? obj.commentCount
      : countObj && typeof countObj.comments === 'number'
      ? countObj.comments
      : Array.isArray(obj.comments)
      ? obj.comments.length
      : 0;

  return {
    id: obj.id,
    content: typeof obj.content === 'string' ? obj.content : '',
    images: asStringArray(obj.images),
    tags: asStringArray(obj.tags),
    author,
    likes: toNumber(obj.likes, 0),
    liked: Boolean(obj.liked),
    commentCount,
    createdAt:
      typeof obj.createdAt === 'string'
        ? obj.createdAt
        : new Date().toISOString(),
  };
}

function normalizeComment(payload: unknown): Comment | null {
  const obj = asObject(payload);
  if (!obj || typeof obj.id !== 'string') {
    return null;
  }

  const author =
    normalizeAuthor(obj.author) ||
    normalizeAuthor(obj.user) || {
      id: 'unknown',
      name: '鍖垮悕鐢ㄦ埛',
      avatar: undefined,
    };

  return {
    id: obj.id,
    content: typeof obj.content === 'string' ? obj.content : '',
    author,
    createdAt:
      typeof obj.createdAt === 'string'
        ? obj.createdAt
        : new Date().toISOString(),
  };
}

function normalizeComments(payload: unknown): Comment[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => normalizeComment(item))
      .filter((item): item is Comment => item !== null);
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const candidates = [obj.data, obj.items, obj.comments];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }
    return candidate
      .map((item) => normalizeComment(item))
      .filter((item): item is Comment => item !== null);
  }

  const single = normalizeComment(obj);
  return single ? [single] : [];
}

function normalizePaginatedPosts(
  payload: unknown,
  page: number,
  limit: number,
): PaginatedPosts {
  if (Array.isArray(payload)) {
    const data = payload
      .map((item) => normalizePostItem(item))
      .filter((item): item is PostItem => item !== null);
    return {
      data,
      total: data.length,
      page,
      limit,
    };
  }

  const obj = asObject(payload);
  if (!obj) {
    return {
      data: [],
      total: 0,
      page,
      limit,
    };
  }

  const listCandidate = Array.isArray(obj.data)
    ? obj.data
    : Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.posts)
    ? obj.posts
    : [];

  const data = listCandidate
    .map((item) => normalizePostItem(item))
    .filter((item): item is PostItem => item !== null);

  return {
    data,
    total: toNumber(obj.total, data.length),
    page: toNumber(obj.page, page),
    limit: toNumber(obj.limit, limit),
  };
}

export const postsApi = {
  async list(page = 1, limit = 10, visibility?: string): Promise<PaginatedPosts> {
    const params: any = { page, limit };
    if (visibility) params.visibility = visibility;
    const { data } = await client.get<unknown>('/posts', { params });
    return normalizePaginatedPosts(data, page, limit);
  },

  async get(id: string): Promise<PostItem> {
    const { data } = await client.get<unknown>(`/posts/${id}`);
    const normalized = normalizePostItem(data);
    if (!normalized) {
      throw new Error('Invalid post response payload');
    }
    return normalized;
  },

  async create(body: { content: string; images?: string[]; tags?: string[]; visibility?: 'PUBLIC' | 'BUDDIES_ONLY'; postType?: 'NORMAL' | 'PROGRESS_REPORT'; sourceType?: string; sourceRefId?: string; aiDraftPayload?: Record<string, unknown> }): Promise<PostItem> {
    const { data } = await client.post<unknown>('/posts', body);
    const normalized = normalizePostItem(data);
    if (!normalized) {
      throw new Error('Invalid post response payload');
    }
    return normalized;
  },

  async remove(id: string): Promise<void> {
    await client.delete(`/posts/${id}`);
  },

  async toggleLike(id: string): Promise<void> {
    await client.post(`/posts/${id}/like`);
  },

  async getComments(postId: string): Promise<Comment[]> {
    const { data } = await client.get<unknown>(`/posts/${postId}/comments`);
    return normalizeComments(data);
  },

  async addComment(postId: string, content: string): Promise<Comment> {
    const { data } = await client.post<unknown>(`/posts/${postId}/comments`, { content });
    const normalized = normalizeComment(data);
    if (!normalized) {
      throw new Error('Invalid comment response payload');
    }
    return normalized;
  },

  async removeComment(commentId: string): Promise<void> {
    await client.delete(`/comments/${commentId}`);
  },

  async createFromTraining(body: { trainingRecordId: string; content: string; images?: string[]; tags?: string[] }): Promise<PostItem> {
    const { data } = await client.post<unknown>('/posts/from-training', body);
    const normalized = normalizePostItem(data);
    if (!normalized) {
      throw new Error('Invalid training post response payload');
    }
    return normalized;
  },

  async generateAiDraft(): Promise<{ content: string; suggestedImages: string[]; metrics?: any }> {
    const { data } = await client.post<any>('/posts/draft/ai');
    return data;
  },

  async generateDraftFromTraining(recordId: string): Promise<{ content: string; suggestedImages: string[]; metrics?: any }> {
    const { data } = await client.post<any>(`/posts/from-training/${recordId}`);
    return data;
  },
};

