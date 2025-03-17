import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/auth/auth.service';
import type { AuthContextType, User, RegisterData, AuthProviderProps } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (authService.isAuthenticated()) {
          setUser(authService.getUser());
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.login({ email, password });
      setUser(response.user);
    } catch (error) {
      setError('Invalid email or password');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setError(null);
      setLoading(true);
      const response = await authService.register(data);
      setUser(response.user);
    } catch (error) {
      setError('Registration failed. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await authService.logout();
      setUser(null);
    } catch (error) {
      setError('Logout failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, []);

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    login,
    register,
    logout,
    loading,
    error,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 