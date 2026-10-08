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

type AuthValue = {
  user: AuthUser | null;
  token: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: 'login' | 'register';
  authModalRole: 'client' | 'company';
  openAuthModal: () => void;
  openCompanyRegistrationModal: () => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<AuthUser>;
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
  const [authModalRole, setAuthModalRole] = useState<'client' | 'company'>('client');
  const openAuthModal = useCallback(() => {
    setAuthModalMode('login');
    setAuthModalRole('client');
    setAuthModalOpen(true);
  }, []);
  const openCompanyRegistrationModal = useCallback(() => {
    setAuthModalMode('register');
    setAuthModalRole('company');
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

  const login = useCallback(async (email: string, password: string) => {
    return acceptSession(await api.authLogin(email, password));
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
    authModalRole,
    openAuthModal,
    openCompanyRegistrationModal,
    closeAuthModal,
    login,
    register,
    registerClient,
    registerCompany,
    logout,
    refreshProfile,
  }), [user, token, isLoading, authModalOpen, authModalMode, authModalRole, openAuthModal, openCompanyRegistrationModal, closeAuthModal, login, register, registerClient, registerCompany, logout, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
