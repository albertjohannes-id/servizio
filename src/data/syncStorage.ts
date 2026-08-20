import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'servizio_v1_deviceId';
const SYNC_META_KEY = 'servizio_v1_sync_meta';
const CLOUD_SESSION_KEY = 'servizio_v1_cloud_session';

export type SyncMeta = {
  lastSyncedRevision: number;
  dirty: boolean;
  lastSyncedAt: string | null;
};

export type CloudSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  userId: string;
  email: string;
  emailVerified: boolean;
};

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_KEY, id);
  return id;
}

export async function loadSyncMeta(): Promise<SyncMeta> {
  try {
    const raw = await AsyncStorage.getItem(SYNC_META_KEY);
    if (!raw) return { lastSyncedRevision: 0, dirty: false, lastSyncedAt: null };
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return { lastSyncedRevision: 0, dirty: false, lastSyncedAt: null };
  }
}

export async function saveSyncMeta(meta: SyncMeta): Promise<void> {
  await AsyncStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
}

export async function markDirty(): Promise<void> {
  const meta = await loadSyncMeta();
  if (meta.dirty) return;
  await saveSyncMeta({ ...meta, dirty: true });
}

export async function loadCloudSession(): Promise<CloudSession | null> {
  try {
    const raw = await AsyncStorage.getItem(CLOUD_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CloudSession;
  } catch {
    return null;
  }
}

export async function saveCloudSession(session: CloudSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(CLOUD_SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(CLOUD_SESSION_KEY, JSON.stringify(session));
}

export async function clearCloudData(): Promise<void> {
  await AsyncStorage.multiRemove([SYNC_META_KEY, CLOUD_SESSION_KEY]);
}
