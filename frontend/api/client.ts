import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
const TOKEN_KEY = 'rightnow_token';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend { success, data } envelope & handle 401
client.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
      res.data = res.data.data;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(err);
  }
);

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.join(', ');
      }
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    if (!error.response || (error.response.status ?? 0) >= 500) {
      return '服务不可用，请先启动后端 API 并初始化数据库。';
    }

    if ((error.response.status ?? 0) >= 400) {
      return fallback;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export { TOKEN_KEY };
export default client;
