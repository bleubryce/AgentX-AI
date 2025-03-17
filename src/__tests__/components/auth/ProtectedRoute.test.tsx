import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';

// Mock the useAuth hook
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ProtectedRoute', () => {
  const mockUseAuth = useAuth as jest.Mock;

  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows loading state when authenticating', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true,
      hasRole: jest.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false,
      hasRole: jest.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to unauthorized when lacking required role', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      hasRole: jest.fn().mockReturnValue(false),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <div>Admin Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
  });

  it('renders children when authenticated and authorized', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      hasRole: jest.fn().mockReturnValue(true),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="USER">
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
}); 