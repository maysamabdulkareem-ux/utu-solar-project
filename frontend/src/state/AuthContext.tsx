import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, type AuthResponse, type AuthUser, type CompanyRegistrationBody } from '../api/client';
import { clearDeviceRequestData } from './requestStorage';

export const AUTH_TOKEN_KEY = 'utu-auth-token';

type ClientRegistration = { email: string; phone?: string; password: string; full_name: string };

export type AccountRole = AuthUser['role'];

/**
 * Thrown by `login` when the account exists but belongs to a different
 * sign-in screen (for example a client account used on the company portal).
 * No session is stored in that case.
 */
export class WrongAccountTypeError extends Error {
  constructor(readonly role: AccountRole) {
    super(`This is a ${role} account`);
    this.name = 'WrongAccountTypeError';
  }
}

type LoginOptions = {
  /** Only these account types may sign in from the calling screen. */
  allowedRoles?: readonly AccountRole[];
};

type AuthValue = {
  user: AuthUser | null;
  token: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: () => void;
  openClientRegistration: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string, options?: LoginOptions) => Promise<AuthUser>;
  register: (kind: 'client' | 'company', body: ClientRegistration | CompanyRegistrationBody) => Promise<AuthUser>;
  registerClient: (body: ClientRegistration) => Promise<AuthUser>;
  registerCompany: (body: CompanyRegistrationBody) => Promise<AuthUser>;
  logout: () => void;
  refreshProfile: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthValue | null>(null);

function readToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistToken(token: string) {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Keep the active session in memory if browser storage is unavailable.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(Boolean(readToken()));
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  // The pop-up is the client sign-in screen; companies use the portal page.
  const openAuthModal = useCallback(() => {
    setAuthModalMode('login');
    setAuthModalOpen(true);
  }, []);
  const openClientRegistration = useCallback(() => {
    setAuthModalMode('register');
    setAuthModalOpen(true);
  }, []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const acceptSession = useCallback((response: AuthResponse) => {
    persistToken(response.access_token);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const profile = await api.authMe(token);
      setUser(profile);
      return profile;
    } catch (cause) {
      if (cause instanceof ApiError && (cause.status === 401 || cause.status === 403)) {
        persistToken('');
        setToken('');
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string, options?: LoginOptions) => {
    const response = await api.authLogin(email, password);
    // Check the account type before keeping the session, so a wrong-door
    // sign-in leaves nothing behind (and does not clear the device's data).
    if (options?.allowedRoles && !options.allowedRoles.includes(response.user.role)) {
      throw new WrongAccountTypeError(response.user.role);
    }
    return acceptSession(response);
  }, [acceptSession]);

  const registerClient = useCallback(async (body: ClientRegistration) => {
    return acceptSession(await api.authRegisterClient(body));
  }, [acceptSession]);

  const registerCompany = useCallback(async (body: CompanyRegistrationBody) => {
    return acceptSession(await api.authRegisterCompany(body));
  }, [acceptSession]);

  const register = useCallback(async (kind: 'client' | 'company', body: ClientRegistration | CompanyRegistrationBody) => {
    if (kind === 'client') {
      if (!('full_name' in body)) throw new Error('Client registration requires a full name');
      return registerClient(body);
    }
    if (!('name' in body)) throw new Error('Company registration requires a company name');
    return registerCompany(body);
  }, [registerClient, registerCompany]);

  const logout = useCallback(() => {
    persistToken('');
    // Leave nothing behind for the next person on a shared device.
    clearDeviceRequestData();
    setToken('');
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    authModalOpen,
    authModalMode,
    openAuthModal,
    openClientRegistration,
    closeAuthModal,
    login,
    register,
    registerClient,
    registerCompany,
    logout,
    refreshProfile,
  }), [user, token, isLoading, authModalOpen, authModalMode, openAuthModal, openClientRegistration, closeAuthModal, login, register, registerClient, registerCompany, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
