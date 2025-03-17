import type { ReactNode, PropsWithChildren } from 'react';

// Auth Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends Omit<User, 'id' | 'role'> {
  password: string;
}

// API Types
export interface ApiErrorResponse {
  message: string;
  status: number;
  data?: unknown;
}

// Component Props Types
export interface ProtectedRouteProps {
  children: JSX.Element | null;
  requiredRole?: string;
}

export interface AuthProviderProps {
  children: JSX.Element | JSX.Element[] | null;
}

// Context Types
export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  hasRole: (role: string) => boolean;
} 