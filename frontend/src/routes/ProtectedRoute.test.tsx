import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, it, vi } from 'vitest';
import { api, type AuthUser } from '../api/client';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { AuthProvider, AUTH_TOKEN_KEY, useAuth } from '../state/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../api/client', () => ({
  api: {
    authMe: vi.fn(),
    authLogin: vi.fn(),
    authRegisterClient: vi.fn(),
    authRegisterCompany: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
});

it('renders access denied when the signed-in role is not allowed', async () => {
  const clientUser: AuthUser = {
    id: 3,
    email: 'client@example.com',
    phone: null,
    full_name: 'Client',
    role: 'client',
    is_active: true,
    is_verified: false,
    company_id: null,
    created_at: '2026-01-01T00:00:00Z',
  };
  localStorage.setItem(AUTH_TOKEN_KEY, 'client-jwt');
  vi.mocked(api.authMe).mockResolvedValue(clientUser);

  render(
    <LanguageProvider>
      <AuthProvider>
        <ProtectedRoute allowedRoles={['company']}>
          <p>Company workspace</p>
        </ProtectedRoute>
      </AuthProvider>
    </LanguageProvider>,
  );

  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to access this page.');
  expect(screen.queryByText('Company workspace')).not.toBeInTheDocument();
});

it('keeps a protected destination open while asking a signed-out user to sign in', async () => {
  function AuthModalState() {
    const { authModalOpen } = useAuth();
    return <p>{authModalOpen ? 'Sign-in requested' : 'Sign-in closed'}</p>;
  }

  window.location.hash = '#/admin';
  render(
    <LanguageProvider>
      <AuthProvider>
        <ProtectedRoute allowedRoles={['admin']}><p>Admin dashboard</p></ProtectedRoute>
        <AuthModalState />
      </AuthProvider>
    </LanguageProvider>,
  );

  expect(await screen.findByText('Sign-in requested')).toBeInTheDocument();
  expect(window.location.hash).toBe('#/admin');
  window.location.hash = '';
});
