import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, SafeUser } from '../lib/types';
import { api, setAuthToken, ApiClientError } from '../lib/api';

export interface AuthContextValue {
  user: SafeUser | null;
  role: Role | null;
  token: string | null;
  loading: boolean;
  login: (token: string, role: Role, user: SafeUser) => void;
  updateUser: (user: SafeUser) => void;
  setRole: (role: Role) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'km_token';
const ROLE_KEY = 'km_role';
const USER_KEY = 'km_user';

function readStoredUser(): SafeUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SafeUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem(ROLE_KEY) as Role) || null);
  const [user, setUser] = useState<SafeUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState<boolean>(() => Boolean(token));

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      api
        .me()
        .then((res) => {
          setUser(res.user);
          if (res.role) {
            setRole(res.role);
            localStorage.setItem(ROLE_KEY, res.role);
          }
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        })
        .catch((err) => {
          if (err instanceof ApiClientError && err.status === 401) {
            setToken(null);
            setRole(null);
            setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(ROLE_KEY);
            localStorage.removeItem(USER_KEY);
            setAuthToken(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback((newToken: string, newRole: Role, newUser: SafeUser) => {
    setToken(newToken);
    setRole(newRole);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(ROLE_KEY, newRole);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setAuthToken(newToken);
  }, []);

  const updateUser = useCallback((newUser: SafeUser) => {
    setUser(newUser);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, role, token, loading, login, updateUser, setRole, logout, isLoggedIn: Boolean(token) }),
    [user, role, token, loading, login, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
