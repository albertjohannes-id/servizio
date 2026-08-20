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
import {
  ApiError,
  checkEmail,
  registerUser,
  requestOtp,
  verifyOtp,
  VerifyOtpResult,
} from './apiClient';
import { clearState } from './repository';
import {
  clearCloudData,
  loadCloudSession,
  saveCloudSession,
  saveSyncMeta,
  CloudSession,
} from './syncStorage';
import {
  generateSalt,
  hashPin,
  MAX_PIN_ATTEMPTS,
  UNLOCK_TTL_MS,
  verifyPin,
} from './pinAuth';
import { AppState } from '../domain/types';

export type AuthGate = 'loading' | 'setup' | 'locked' | 'unlocked';

export type EmailCheckResult =
  | { type: 'new' }
  | { type: 'existing'; emailVerified: boolean }
  | { type: 'offline' };

type AuthContextValue = {
  ready: boolean;
  gate: AuthGate;
  email: string | null;
  failedAttempts: number;
  canResetAfterLockout: boolean;
  setupEmail: string;
  setSetupEmail: (value: string) => void;
  emailVerified: boolean;
  cloudLinked: boolean;
  pendingCloudBlob: AppState | null;
  clearPendingCloudBlob: () => void;
  checkSetupEmail: () => Promise<EmailCheckResult>;
  requestSetupOtp: () => Promise<{ ok: true; devOtp?: string } | { ok: false; error: string }>;
  verifySetupOtp: (
    code: string
  ) => Promise<{ ok: true; hasCloudData: boolean } | { ok: false; error: string }>;
  completeSetup: (pin: string, confirmPin: string) => Promise<string | null>;
  registerCloudAccount: () => Promise<{ ok: true } | { ok: false; error: string }>;
  startEmailVerification: () => Promise<{ ok: true; devOtp?: string } | { ok: false; error: string }>;
  confirmEmailVerification: (
    code: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  refreshCloudStatus: () => Promise<void>;
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

function applySessionFromVerify(result: VerifyOtpResult): CloudSession {
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: result.accessExpiresAt,
    userId: result.userId,
    email: result.email,
    emailVerified: result.emailVerified,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState<AuthGate>('loading');
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [setupEmail, setSetupEmail] = useState('');
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [pendingCloudBlob, setPendingCloudBlob] = useState<AppState | null>(null);
  const profileRef = useRef<AuthProfile | null>(null);

  const syncProfile = useCallback((next: AuthProfile | null) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  const refreshCloudStatus = useCallback(async () => {
    const session = await loadCloudSession();
    setCloudSession(session);
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
      await refreshCloudStatus();
      await applyGateFromStorage(auth);
      setReady(true);
    })();
  }, [applyGateFromStorage, refreshCloudStatus, syncProfile]);

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

  const checkSetupEmail = useCallback(async (): Promise<EmailCheckResult> => {
    const email = setupEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { type: 'offline' };
    try {
      const result = await checkEmail(email);
      if (result.exists) return { type: 'existing', emailVerified: result.emailVerified };
      return { type: 'new' };
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'network_error' || err.status === 0)) {
        return { type: 'offline' };
      }
      return { type: 'offline' };
    }
  }, [setupEmail]);

  const requestSetupOtp = useCallback(async () => {
    const email = setupEmail.trim().toLowerCase();
    try {
      const result = await requestOtp(email);
      return { ok: true as const, devOtp: result.devOtp };
    } catch (err) {
      if (err instanceof ApiError) {
        return { ok: false as const, error: err.code };
      }
      return { ok: false as const, error: 'request_failed' };
    }
  }, [setupEmail]);

  const verifySetupOtp = useCallback(
    async (code: string) => {
      const email = setupEmail.trim().toLowerCase();
      try {
        const result = await verifyOtp(email, code);
        const session = applySessionFromVerify(result);
        await saveCloudSession(session);
        setCloudSession(session);
        await saveSyncMeta({
          lastSyncedRevision: result.sync.revision,
          dirty: false,
          lastSyncedAt: result.sync.updatedAt,
        });
        const blob = result.sync.blob;
        const hasCloudData =
          result.sync.hasData &&
          !!blob &&
          ((blob.assets?.length ?? 0) > 0 || (blob.logs?.length ?? 0) > 0);
        if (hasCloudData && blob) setPendingCloudBlob(blob);
        else setPendingCloudBlob(null);
        return { ok: true as const, hasCloudData };
      } catch (err) {
        if (err instanceof ApiError) {
          return { ok: false as const, error: err.code };
        }
        return { ok: false as const, error: 'verify_failed' };
      }
    },
    [setupEmail]
  );

  const registerCloudAccount = useCallback(async () => {
    const email = setupEmail.trim().toLowerCase();
    try {
      await registerUser(email);
      return { ok: true as const };
    } catch (err) {
      if (err instanceof ApiError && err.code === 'email_exists') {
        return { ok: false as const, error: 'email_exists' };
      }
      if (err instanceof ApiError && err.code === 'network_error') {
        return { ok: false as const, error: 'network_error' };
      }
      return { ok: false as const, error: 'register_failed' };
    }
  }, [setupEmail]);

  const startEmailVerification = useCallback(async () => {
    const email = (profile?.email ?? setupEmail).trim().toLowerCase();
    try {
      const result = await requestOtp(email);
      return { ok: true as const, devOtp: result.devOtp };
    } catch (err) {
      if (err instanceof ApiError) return { ok: false as const, error: err.code };
      return { ok: false as const, error: 'request_failed' };
    }
  }, [profile?.email, setupEmail]);

  const confirmEmailVerification = useCallback(
    async (code: string) => {
      const email = (profile?.email ?? setupEmail).trim().toLowerCase();
      try {
        const result = await verifyOtp(email, code);
        const session = applySessionFromVerify(result);
        await saveCloudSession(session);
        setCloudSession(session);
        await saveSyncMeta({
          lastSyncedRevision: result.sync.revision,
          dirty: true,
          lastSyncedAt: null,
        });
        return { ok: true as const };
      } catch (err) {
        if (err instanceof ApiError) return { ok: false as const, error: err.code };
        return { ok: false as const, error: 'verify_failed' };
      }
    },
    [profile?.email, setupEmail]
  );

  const clearPendingCloudBlob = useCallback(() => setPendingCloudBlob(null), []);

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
      await clearCloudData();
      await AsyncStorage.removeItem('servizio_v1_session');
      syncProfile(null);
      setCloudSession(null);
      setPendingCloudBlob(null);
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
      emailVerified: cloudSession?.emailVerified ?? false,
      cloudLinked: !!cloudSession,
      pendingCloudBlob,
      clearPendingCloudBlob,
      checkSetupEmail,
      requestSetupOtp,
      verifySetupOtp,
      completeSetup,
      registerCloudAccount,
      startEmailVerification,
      confirmEmailVerification,
      refreshCloudStatus,
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
      cloudSession,
      pendingCloudBlob,
      clearPendingCloudBlob,
      checkSetupEmail,
      requestSetupOtp,
      verifySetupOtp,
      completeSetup,
      registerCloudAccount,
      startEmailVerification,
      confirmEmailVerification,
      refreshCloudStatus,
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
