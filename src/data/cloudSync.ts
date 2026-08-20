import { AppState } from '../domain/types';
import { ApiError, getSync, putSync } from './apiClient';
import {
  clearCloudData,
  loadCloudSession,
  loadSyncMeta,
  saveSyncMeta,
} from './syncStorage';
import { loadState, saveState } from './repository';
import { stripLocalPhotoUris, uploadPendingPhotos } from './photoSync';

export type SyncConflict = {
  type: 'conflict';
  serverRevision: number;
  local: AppState;
  server: AppState | null;
};

export type SyncResult =
  | { type: 'idle'; revision: number; lastSyncedAt: string | null }
  | { type: 'pushed'; revision: number; lastSyncedAt: string }
  | { type: 'pulled'; revision: number; lastSyncedAt: string; state: AppState }
  | { type: 'offline' }
  | { type: 'not_linked' }
  | SyncConflict
  | { type: 'error'; message: string; code?: string };

function isAuthFailure(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.status === 401 ||
      err.code === 'unauthorized' ||
      err.code === 'invalid_refresh' ||
      err.code === 'refresh_expired' ||
      err.code === 'device_mismatch')
  );
}

function isStillLocal(uri: string | null): boolean {
  return !!uri && !uri.startsWith('r2:');
}

/** Push local if dirty; pull if cloud ahead. Caller applies pulled state. */
export async function runCloudSync(): Promise<SyncResult> {
  const session = await loadCloudSession();
  if (!session) return { type: 'not_linked' };

  const meta = await loadSyncMeta();
  let local = await loadState();

  try {
    if (meta.dirty) {
      try {
        const uploaded = await uploadPendingPhotos(local);
        if (uploaded.changed) {
          local = uploaded.state;
          await saveState(local);
        }
        const blob = stripLocalPhotoUris(local);
        const put = await putSync(meta.lastSyncedRevision, blob);
        const merged: AppState = {
          ...local,
          logs: local.logs.map((log) => {
            const cloud = blob.logs.find((l) => l.id === log.id);
            if (!cloud) return log;
            return {
              ...log,
              receiptUri: cloud.receiptUri ?? (isStillLocal(log.receiptUri) ? log.receiptUri : null),
              serviceTagUri:
                cloud.serviceTagUri ??
                (isStillLocal(log.serviceTagUri) ? log.serviceTagUri : null),
            };
          }),
        };
        await saveState(merged);
        await saveSyncMeta({
          lastSyncedRevision: put.revision,
          dirty: false,
          lastSyncedAt: put.updatedAt,
        });
        return { type: 'pushed', revision: put.revision, lastSyncedAt: put.updatedAt };
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const remote = await getSync();
          return {
            type: 'conflict',
            serverRevision: Number(err.extra?.serverRevision ?? remote.revision),
            local,
            server: remote.blob,
          };
        }
        throw err;
      }
    }

    const remote = await getSync();
    if (remote.revision > meta.lastSyncedRevision) {
      if (remote.blob) {
        await saveState(remote.blob);
        await saveSyncMeta({
          lastSyncedRevision: remote.revision,
          dirty: false,
          lastSyncedAt: remote.updatedAt,
        });
        return {
          type: 'pulled',
          revision: remote.revision,
          lastSyncedAt: remote.updatedAt,
          state: remote.blob,
        };
      }
      await saveSyncMeta({
        lastSyncedRevision: remote.revision,
        dirty: false,
        lastSyncedAt: remote.updatedAt,
      });
      return {
        type: 'idle',
        revision: remote.revision,
        lastSyncedAt: remote.updatedAt,
      };
    }

    return {
      type: 'idle',
      revision: meta.lastSyncedRevision,
      lastSyncedAt: meta.lastSyncedAt,
    };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'network_error') return { type: 'offline' };
    if (isAuthFailure(err)) {
      await clearCloudData();
      return { type: 'not_linked' };
    }
    return {
      type: 'error',
      message: err instanceof Error ? err.message : 'sync_failed',
      code: err instanceof ApiError ? err.code : undefined,
    };
  }
}

export async function resolveConflictKeepLocal(
  local: AppState,
  serverRevision: number
): Promise<{ revision: number; lastSyncedAt: string }> {
  const uploaded = await uploadPendingPhotos(local);
  const nextLocal = uploaded.changed ? uploaded.state : local;
  if (uploaded.changed) await saveState(nextLocal);
  const blob = stripLocalPhotoUris(nextLocal);

  try {
    const put = await putSync(serverRevision, blob);
    await saveSyncMeta({
      lastSyncedRevision: put.revision,
      dirty: false,
      lastSyncedAt: put.updatedAt,
    });
    return { revision: put.revision, lastSyncedAt: put.updatedAt };
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const remote = await getSync();
      const put = await putSync(remote.revision, blob);
      await saveSyncMeta({
        lastSyncedRevision: put.revision,
        dirty: false,
        lastSyncedAt: put.updatedAt,
      });
      return { revision: put.revision, lastSyncedAt: put.updatedAt };
    }
    throw err;
  }
}

export async function resolveConflictUseCloud(
  server: AppState,
  revision: number
): Promise<AppState> {
  await saveState(server);
  const ts = new Date().toISOString();
  await saveSyncMeta({
    lastSyncedRevision: revision,
    dirty: false,
    lastSyncedAt: ts,
  });
  return server;
}
