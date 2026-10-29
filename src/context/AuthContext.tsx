import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { setAuthLostHandler, tokenStore } from '../api/client';
import { AuthApi, RegisterPayload } from '../api/endpoints';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** true while we check for a saved session on app start */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
  }, []);

  // Restore a saved session.
  useEffect(() => {
    setAuthLostHandler(() => setUser(null));
    (async () => {
      try {
        if (await tokenStore.getAccess()) setUser(await AuthApi.me());
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
    return () => setAuthLostHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await AuthApi.login(email.trim().toLowerCase(), password);
    await tokenStore.setTokens(data.access, data.refresh);
    setUser(data.user);
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await AuthApi.register(payload);
      await login(payload.email, payload.password); // sign in straight away
    },
    [login],
  );

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
