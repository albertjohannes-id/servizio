import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const KEY = 'servizio_v1_session';

type AuthContextValue = {
  ready: boolean;
  email: string | null;
  login: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => setEmail(raw))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (value: string) => {
    const next = value.trim().toLowerCase();
    await AsyncStorage.setItem(KEY, next);
    setEmail(next);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(KEY);
    setEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ ready, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
