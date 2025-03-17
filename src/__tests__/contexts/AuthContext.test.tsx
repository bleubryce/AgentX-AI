import React from 'react';
import type { PropsWithChildren } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth/auth.service';
import type { User, AuthProviderProps } from '../../types';

// Mock the AuthService
jest.mock('../../services/auth/auth.service', () => ({
  getInstance: jest.fn(),
}));

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
};

const TestComponent = () => {
  const { isAuthenticated, user, login, logout, error } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'Authenticated' : 'Not authenticated'}
      </div>
      {user && (
        <div data-testid="user-info">
          {user.email} - {user.role}
        </div>
      )}
      {error && <div data-testid="error-message">{error}</div>}
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    isAuthenticated: jest.fn(),
    getToken: jest.fn(),
    getUser: jest.fn(),
    hasRole: jest.fn(),
    setSession: jest.fn(),
    clearSession: jest.fn(),
    decodeToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getInstance as jest.Mock).mockReturnValue(mockAuthService);
    mockAuthService.isAuthenticated.mockReturnValue(false);
  });

  it('provides authentication status', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
  });

  it('handles successful login', async () => {
    mockAuthService.login.mockResolvedValueOnce({ user: mockUser });
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getUser.mockReturnValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-info')).toHaveTextContent('test@example.com - USER');
    });
  });

  it('handles login failure', async () => {
    mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Invalid email or password');
    });
  });

  it('handles logout', async () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getUser.mockReturnValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not authenticated');
    });
  });

  it('checks user roles', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    mockAuthService.getUser.mockReturnValue(mockUser);
    mockAuthService.hasRole.mockReturnValue(true);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }: AuthProviderProps) => (
        <AuthProvider>{children}</AuthProvider>
      ),
    });

    expect(result.current.hasRole('USER')).toBe(true);
    expect(mockAuthService.hasRole).toHaveBeenCalledWith('USER');
  });
}); 