export type AdminRole = 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'FROZEN';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: UserStatus;
}

export interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | AdminRole;
  status: UserStatus;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeSource {
  id: string;
  sourceName: string;
  domain: string;
  fileType?: string;
  chunksCount: number;
  status: string;
  uploadedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplate {
  id: string;
  key: string;
  scene: string;
  content: string;
  variables?: unknown;
  enabled: boolean;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptBindingCurrent {
  id: string;
  content: string;
  variables: string[];
  enabled: boolean;
  updatedAt: string;
  updater?: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export interface PromptBinding {
  code: string;
  title: string;
  description: string;
  scene: string;
  key: string;
  variables: string[];
  fallbackContent: string;
  current: PromptBindingCurrent | null;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  diff?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  actor: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}