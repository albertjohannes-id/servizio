import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'servizio_v1_auth';
const UNLOCK_KEY = 'servizio_v1_unlock';
const LEGACY_SESSION_KEY = 'servizio_v1_session';

export type AuthProfile = {
  email: string;
  pinSalt: string;
  pinHash: string;
  failedAttempts: number;
  setupAt: string;
};

export type UnlockSession = {
  unlockedUntil: number;
};

export async function loadAuthProfile(): Promise<AuthProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthProfile;
    if (!parsed.email || !parsed.pinSalt || !parsed.pinHash) return null;
    return {
      ...parsed,
      failedAttempts: parsed.failedAttempts ?? 0,
    };
  } catch {
    return null;
  }
}

export async function saveAuthProfile(profile: AuthProfile): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
}

export async function clearAuthProfile(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_KEY, UNLOCK_KEY, LEGACY_SESSION_KEY]);
}

export async function loadUnlockSession(): Promise<UnlockSession | null> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UnlockSession;
    if (typeof parsed.unlockedUntil !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveUnlockSession(unlockedUntil: number): Promise<void> {
  await AsyncStorage.setItem(UNLOCK_KEY, JSON.stringify({ unlockedUntil }));
}

export async function clearUnlockSession(): Promise<void> {
  await AsyncStorage.removeItem(UNLOCK_KEY);
}

export async function loadLegacyEmail(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(LEGACY_SESSION_KEY);
  return raw?.trim().toLowerCase() || null;
}

export async function clearLegacySession(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_SESSION_KEY);
}

export function isUnlockValid(session: UnlockSession | null, now = Date.now()): boolean {
  return !!session && session.unlockedUntil > now;
}
