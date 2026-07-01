import client, { TOKEN_KEY } from './client';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  gender?: 'male' | 'female';
  bodyStyle?: string;
  idealBodyImage?: string;
  currentPhase?: string;
  isProfileComplete: boolean;
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  goalWeight?: number | null;
  activityLevel?: string | null;
  userImage?: string;
  userFaceImage?: string;
}

export interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

export const authApi = {
  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const { data } = await client.post<AuthResponse>('/auth/register', { email, password, name });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await client.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.access_token);
    return data;
  },

  async me(): Promise<AuthUser> {
    const { data } = await client.get<AuthUser>('/auth/me');
    return data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },
};
