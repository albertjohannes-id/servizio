import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, Platform } from 'react-native';
import {
  AuthProfile,
  clearAuthProfile,
  clearLegacySession,
  clearUnlockSession,
  isUnlockValid,
  loadAuthProfile,
  loadLegacyEmail,
  loadUnlockSession,
  saveAuthProfile,
  saveUnlockSession,
} from './authStorage';
import { clearState } from './repository';
import {
  generateSalt,
  hashPin,
  MAX_PIN_ATTEMPTS,
  UNLOCK_TTL_MS,
  verifyPin,
} from './pinAuth';

export type AuthGate = 'loading' | 'setup' | 'locked' | 'unlocked';

type AuthContextValue = {
  ready: boolean;
  gate: AuthGate;
  email: string | null;
  failedAttempts: number;
  canResetAfterLockout: boolean;
  setupEmail: string;
  setSetupEmail: (value: string) => void;
  completeSetup: (pin: string, confirmPin: string) => Promise<string | null>;
  tryUnlock: (pin: string) => Promise<string | null>;
  verifyCurrentPin: (pin: string) => Promise<boolean>;
  lock: () => Promise<void>;
  touchActivity: () => void;
  resetDevice: (reason: 'lockout' | 'manual') => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function notifyDeviceReset(reason: 'lockout' | 'manual'): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Servizio reset',
        body:
          reason === 'lockout'
            ? 'Too many wrong PIN attempts. Local data on this device was cleared.'
            : 'All Servizio data on this device was erased.',
      },
      trigger: null,
    });
  } catch {
    // best-effort
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState<AuthGate>('loading');
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [setupEmail, setSetupEmail] = useState('');
  const profileRef = useRef<AuthProfile | null>(null);

  const syncProfile = useCallback((next: AuthProfile | null) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  const applyGateFromStorage = useCallback(async (auth: AuthProfile | null) => {
    if (!auth) {
      setGate('setup');
      return;
    }
    const unlock = await loadUnlockSession();
    setGate(isUnlockValid(unlock) ? 'unlocked' : 'locked');
  }, []);

  useEffect(() => {
    (async () => {
      const auth = await loadAuthProfile();
      if (auth) {
        syncProfile(auth);
        setSetupEmail(auth.email);
      } else {
        const legacy = await loadLegacyEmail();
        if (legacy) setSetupEmail(legacy);
      }
      await applyGateFromStorage(auth);
      setReady(true);
    })();
  }, [applyGateFromStorage, syncProfile]);

  const touchActivity = useCallback(() => {
    if (gate !== 'unlocked') return;
    void saveUnlockSession(Date.now() + UNLOCK_TTL_MS);
  }, [gate]);

  useEffect(() => {
    if (gate !== 'unlocked') return;
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void loadUnlockSession().then((session) => {
          if (!isUnlockValid(session)) setGate('locked');
        });
      }
    });
    const interval = setInterval(() => {
      void loadUnlockSession().then((session) => {
        if (!isUnlockValid(session)) setGate('locked');
      });
    }, 30_000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [gate]);

  const completeSetup = useCallback(
    async (pin: string, confirmPin: string): Promise<string | null> => {
      const email = setupEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid_email';
      if (pin !== confirmPin) return 'pin_mismatch';
      const salt = await generateSalt();
      const pinHash = await hashPin(pin, salt);
      const next: AuthProfile = {
        email,
        pinSalt: salt,
        pinHash,
        failedAttempts: 0,
        setupAt: new Date().toISOString(),
      };
      await saveAuthProfile(next);
      await clearLegacySession();
      await saveUnlockSession(Date.now() + UNLOCK_TTL_MS);
      syncProfile(next);
      setGate('unlocked');
      return null;
    },
    [setupEmail, syncProfile]
  );

  const recordFailedAttempt = useCallback(async (): Promise<AuthProfile | null> => {
    const current = profileRef.current;
    if (!current) return null;
    const next = { ...current, failedAttempts: current.failedAttempts + 1 };
    await saveAuthProfile(next);
    syncProfile(next);
    return next;
  }, [syncProfile]);

  const tryUnlock = useCallback(
    async (pin: string): Promise<string | null> => {
      const current = profileRef.current;
      if (!current) return 'no_profile';
      const ok = await verifyPin(pin, current.pinSalt, current.pinHash);
      if (!ok) {
        const updated = await recordFailedAttempt();
        if (updated && updated.failedAttempts >= MAX_PIN_ATTEMPTS) return 'locked_out';
        return 'wrong_pin';
      }
      const resetProfile = { ...current, failedAttempts: 0 };
      await saveAuthProfile(resetProfile);
      syncProfile(resetProfile);
      await saveUnlockSession(Date.now() + UNLOCK_TTL_MS);
      setGate('unlocked');
      return null;
    },
    [recordFailedAttempt, syncProfile]
  );

  const verifyCurrentPin = useCallback(async (pin: string): Promise<boolean> => {
    const current = profileRef.current;
    if (!current) return false;
    return verifyPin(pin, current.pinSalt, current.pinHash);
  }, []);

  const lock = useCallback(async () => {
    await clearUnlockSession();
    setGate('locked');
  }, []);

  const resetDevice = useCallback(
    async (reason: 'lockout' | 'manual') => {
      await clearAuthProfile();
      await clearState();
      await AsyncStorage.removeItem('servizio_v1_session');
      syncProfile(null);
      setSetupEmail('');
      setGate('setup');
      await notifyDeviceReset(reason);
    },
    [syncProfile]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      gate,
      email: profile?.email ?? null,
      failedAttempts: profile?.failedAttempts ?? 0,
      canResetAfterLockout: (profile?.failedAttempts ?? 0) >= MAX_PIN_ATTEMPTS,
      setupEmail,
      setSetupEmail,
      completeSetup,
      tryUnlock,
      verifyCurrentPin,
      lock,
      touchActivity,
      resetDevice,
    }),
    [
      ready,
      gate,
      profile,
      setupEmail,
      completeSetup,
      tryUnlock,
      verifyCurrentPin,
      lock,
      touchActivity,
      resetDevice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
