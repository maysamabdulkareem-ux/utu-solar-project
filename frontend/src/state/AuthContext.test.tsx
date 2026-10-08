import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, type AuthResponse, type AuthUser } from '../api/client';
import { AuthProvider, AUTH_TOKEN_KEY, useAuth } from './AuthContext';

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

afterEach(cleanup);
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const user: AuthUser = {
  id: 1,
  email: 'client@example.com',
  phone: null,
  full_name: 'Test Client',
  role: 'client',
  is_active: true,
  is_verified: false,
  company_id: null,
  created_at: '2026-01-01T00:00:00Z',
};

function AuthState() {
  const { user: currentUser, token, isAuthenticated, isLoading, login } = useAuth();
  return (
    <div>
      <output data-testid="state">{JSON.stringify({ currentUser, token, isAuthenticated, isLoading })}</output>
      <button onClick={() => void login('client@example.com', 'valid-password')}>Login</button>
    </div>
  );
}

function readState() {
  return JSON.parse(screen.getByTestId('state').textContent ?? '{}') as {
    currentUser: AuthUser | null;
    token: string;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
}

describe('AuthContext', () => {
  it('starts unauthenticated without a saved token', () => {
    render(<AuthProvider><AuthState /></AuthProvider>);
    expect(readState()).toMatchObject({
      currentUser: null,
      token: '',
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('loads the profile for a persisted token', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'saved-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);

    render(<AuthProvider><AuthState /></AuthProvider>);

    await waitFor(() => expect(readState()).toMatchObject({
      currentUser: user,
      token: 'saved-jwt',
      isAuthenticated: true,
      isLoading: false,
    }));
    expect(api.authMe).toHaveBeenCalledWith('saved-jwt');
  });

  it('persists the JWT returned by login', async () => {
    const response: AuthResponse = {
      access_token: 'new-jwt',
      token_type: 'bearer',
      user,
    };
    vi.mocked(api.authLogin).mockResolvedValue(response);
    vi.mocked(api.authMe).mockResolvedValue(user);
    render(<AuthProvider><AuthState /></AuthProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(readState()).toMatchObject({
      currentUser: user,
      token: 'new-jwt',
      isAuthenticated: true,
    }));
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe('new-jwt');
  });
});
