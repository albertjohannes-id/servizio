import { Dictionary } from '../i18n/strings';
import { SyncMeta } from './syncStorage';
import { SyncUiStatus } from './AssetContext';

function relativeWhen(iso: string | null, t: Dictionary): string {
  if (!iso) return t.syncIdle;
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 60_000) return t.syncJustNow;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return t.syncMinutesAgo.replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 48) return t.syncHoursAgo.replace('{n}', String(hours));
  return iso.slice(0, 10);
}

export function syncStatusLabel(
  status: SyncUiStatus,
  meta: SyncMeta,
  t: Dictionary,
  opts?: { linked?: boolean; lastError?: string | null }
): string {
  if (!opts?.linked || status === 'not_linked') return t.syncNotLinked;
  if (status === 'syncing') return t.syncSyncing;
  if (status === 'conflict') return t.syncConflictTitle;
  if (status === 'offline') return t.syncOffline;
  if (status === 'error') return opts.lastError ? t.syncError : t.syncError;
  if (status === 'pending' || meta.dirty) return t.syncPending;
  if (meta.lastSyncedAt) {
    return t.syncLastAt.replace('{when}', relativeWhen(meta.lastSyncedAt, t));
  }
  return t.syncIdle;
}
