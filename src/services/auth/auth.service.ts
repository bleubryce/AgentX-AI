import { ApiClient } from '../api/client';
import jwtDecode from 'jwt-decode';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
    role: string;
  };
}

interface DecodedToken {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

export class AuthService {
  private static instance: AuthService;
  private apiClient: ApiClient;
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/auth/login', credentials);
    this.setSession(response);
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/auth/register', data);
    this.setSession(response);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearSession();
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.apiClient.post<AuthResponse>('/auth/refresh-token', {});
    this.setSession(response);
    return response;
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.apiClient.post('/auth/password-reset-request', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.apiClient.post('/auth/password-reset', { token, newPassword });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = this.decodeToken(token);
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): AuthResponse['user'] | null {
    const userStr = localStorage.getItem(this.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decoded = this.decodeToken(token);
      return decoded.role === role;
    } catch {
      return false;
    }
  }

  private setSession(authResponse: AuthResponse): void {
    localStorage.setItem(this.tokenKey, authResponse.token);
    localStorage.setItem(this.userKey, JSON.stringify(authResponse.user));
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  private decodeToken(token: string): DecodedToken {
    return jwtDecode<DecodedToken>(token);
  }
} 