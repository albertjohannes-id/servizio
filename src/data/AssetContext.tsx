import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState } from 'react-native';
import {
  AppEvent,
  AppState,
  Asset,
  AssetChange,
  AssetLocation,
  ChangeField,
  ConditionStatus,
  ServiceLog,
  ServiceLogKind,
  Vendor,
} from '../domain/types';
import { todayIso } from '../domain/status';
import { blankState, clearState, emptyState, loadState, normalizeAsset, sampleState, saveState } from './repository';
import { mergeSeedVendors, SEED_VENDORS } from './seed';
import { loadSyncMeta, markDirty, SyncMeta } from './syncStorage';
import {
  resolveConflictKeepLocal,
  resolveConflictUseCloud,
  runCloudSync,
  SyncConflict,
  SyncResult,
} from './cloudSync';

type AssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'archived'> & {
  id?: string;
};

export type SyncUiStatus = 'idle' | 'pending' | 'syncing' | 'offline' | 'conflict' | 'error' | 'not_linked';

interface AssetContextValue {
  ready: boolean;
  state: AppState;
  syncStatus: SyncUiStatus;
  syncMeta: SyncMeta;
  lastSyncError: string | null;
  syncConflict: SyncConflict | null;
  syncNow: () => Promise<SyncResult>;
  resolveSyncKeepLocal: () => Promise<void>;
  resolveSyncUseCloud: () => Promise<void>;
  applyRemoteState: (next: AppState) => Promise<void>;
  setLanguage: (lang: 'en' | 'id') => void;
  upsertAsset: (input: AssetInput) => string;
  archiveAsset: (id: string) => void;
  restoreAsset: (id: string) => void;
  permanentlyDeleteAsset: (id: string) => void;
  setCondition: (id: string, condition: ConditionStatus) => void;
  setLocation: (id: string, location: AssetLocation) => void;
  setHomeColumns: (columns: 2 | 3) => void;
  updateUsage: (id: string, usageCurrent: number) => void;
  logService: (input: {
    assetId: string;
    servicedAt: string;
    serviceKind: ServiceLogKind;
    notes: string;
    cost: number | null;
    receiptUri: string | null;
    serviceTagUri: string | null;
    vendorId: string | null;
    vendorName: string | null;
    nextServiceAt?: string;
    usageNextDue?: number | null;
    /** Enable or update schedule flags when logging routine service on an untracked asset. */
    scheduleByDate?: boolean;
    usageEnabled?: boolean;
    usageInterval?: number | null;
    usageCurrent?: number | null;
  }) => void;
  /** Attach, replace, or clear photos on an existing service log (marks sync dirty). */
  updateLogPhotos: (
    logId: string,
    patch: { receiptUri?: string | null; serviceTagUri?: string | null }
  ) => void;
  addVendor: (name: string) => Vendor;
  track: (eventType: string, payload?: Record<string, unknown>) => void;
  resetDemo: () => void;
  loadSampleData: () => void;
  startEmpty: () => void;
  importState: (next: AppState) => Promise<void>;
  logsFor: (assetId: string) => ServiceLog[];
  changesFor: (assetId: string) => AssetChange[];
}

const AssetContext = createContext<AssetContextValue | null>(null);

function nid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function makeChange(
  assetId: string,
  field: ChangeField,
  oldValue: AssetChange['oldValue'],
  newValue: AssetChange['newValue']
): AssetChange | null {
  if (Object.is(oldValue, newValue)) return null;
  return {
    id: nid('chg'),
    assetId,
    field,
    oldValue,
    newValue,
    createdAt: new Date().toISOString(),
  };
}

export function AssetProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncUiStatus>('idle');
  const [syncMeta, setSyncMeta] = useState<SyncMeta>({
    lastSyncedRevision: 0,
    dirty: false,
    lastSyncedAt: null,
  });
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [syncConflict, setSyncConflict] = useState<SyncConflict | null>(null);
  const syncingRef = useRef(false);
  const conflictRef = useRef(false);

  const refreshSyncMeta = useCallback(async () => {
    const meta = await loadSyncMeta();
    setSyncMeta(meta);
    return meta;
  }, []);

  useEffect(() => {
    Promise.all([loadState(), loadSyncMeta()]).then(([s, meta]) => {
      setState(s);
      setSyncMeta(meta);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready && state) {
      void saveState(state);
    }
  }, [ready, state]);

  const mutate = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => {
      if (!prev) return prev;
      void markDirty().then(() => {
        void refreshSyncMeta().then((meta) => {
          if (!conflictRef.current) {
            setSyncStatus(meta.dirty ? 'pending' : 'idle');
          }
        });
      });
      return fn(prev);
    });
  }, [refreshSyncMeta]);

  const applyRemoteState = useCallback(async (next: AppState) => {
    await saveState(next);
    setState(next);
    await refreshSyncMeta();
  }, [refreshSyncMeta]);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (syncingRef.current) {
      return { type: 'idle', revision: syncMeta.lastSyncedRevision, lastSyncedAt: syncMeta.lastSyncedAt };
    }
    if (conflictRef.current) {
      return {
        type: 'conflict',
        serverRevision: syncConflict?.serverRevision ?? 0,
        local: state ?? blankState(),
        server: syncConflict?.server ?? null,
      };
    }

    syncingRef.current = true;
    setSyncStatus('syncing');
    setLastSyncError(null);
    try {
      const result = await runCloudSync();
      if (result.type === 'pulled') {
        setState(result.state);
        conflictRef.current = false;
        setSyncConflict(null);
        setSyncStatus('idle');
      } else if (result.type === 'conflict') {
        conflictRef.current = true;
        setSyncConflict(result);
        setSyncStatus('conflict');
      } else if (result.type === 'offline') {
        const meta = await refreshSyncMeta();
        setSyncStatus(meta.dirty ? 'offline' : 'offline');
      } else if (result.type === 'error') {
        setLastSyncError(result.message);
        setSyncStatus('error');
      } else if (result.type === 'not_linked') {
        conflictRef.current = false;
        setSyncConflict(null);
        setSyncStatus('not_linked');
      } else {
        conflictRef.current = false;
        setSyncConflict(null);
        const meta = await refreshSyncMeta();
        setSyncStatus(meta.dirty ? 'pending' : 'idle');
      }
      if (result.type === 'pushed' || result.type === 'pulled' || result.type === 'idle') {
        await refreshSyncMeta();
      }
      return result;
    } finally {
      syncingRef.current = false;
    }
  }, [refreshSyncMeta, state, syncConflict, syncMeta.lastSyncedAt, syncMeta.lastSyncedRevision]);

  const resolveSyncKeepLocal = useCallback(async () => {
    if (!syncConflict) return;
    try {
      await resolveConflictKeepLocal(syncConflict.local, syncConflict.serverRevision);
      conflictRef.current = false;
      setSyncConflict(null);
      await refreshSyncMeta();
      setSyncStatus('idle');
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'conflict_resolve_failed');
      setSyncStatus('error');
    }
  }, [refreshSyncMeta, syncConflict]);

  const resolveSyncUseCloud = useCallback(async () => {
    if (!syncConflict?.server) return;
    try {
      const next = await resolveConflictUseCloud(syncConflict.server, syncConflict.serverRevision);
      setState(next);
      conflictRef.current = false;
      setSyncConflict(null);
      await refreshSyncMeta();
      setSyncStatus('idle');
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'conflict_resolve_failed');
      setSyncStatus('error');
    }
  }, [refreshSyncMeta, syncConflict]);

  useEffect(() => {
    if (!ready || conflictRef.current) return;
    const id = setTimeout(() => {
      void syncNow();
    }, 900);
    return () => clearTimeout(id);
  }, [ready, state, syncNow]);

  useEffect(() => {
    if (!ready) return;
    const sub = RNAppState.addEventListener('change', (next) => {
      if (next === 'active' && !conflictRef.current) void syncNow();
    });
    return () => sub.remove();
  }, [ready, syncNow]);

  const track = useCallback((eventType: string, payload?: Record<string, unknown>) => {
    const event: AppEvent = {
      id: nid('evt'),
      eventType,
      payload,
      createdAt: new Date().toISOString(),
    };
    mutate((prev) => ({ ...prev, events: [event, ...prev.events].slice(0, 200) }));
  }, [mutate]);

  const value = useMemo<AssetContextValue>(() => {
    const s = state ?? {
      assets: [],
      logs: [],
      changes: [],
      vendors: [],
      events: [],
      language: 'en' as const,
      homeColumns: 2 as const,
    };

    return {
      ready,
      state: s,
      syncStatus,
      syncMeta,
      lastSyncError,
      syncConflict,
      syncNow,
      resolveSyncKeepLocal,
      resolveSyncUseCloud,
      applyRemoteState,
      setLanguage: (language) => mutate((prev) => ({ ...prev, language })),
      setHomeColumns: (homeColumns) => mutate((prev) => ({ ...prev, homeColumns })),
      upsertAsset: (input) => {
        const now = todayIso();
        let id = input.id;
        const before = input.id ? s.assets.find((a) => a.id === input.id) : undefined;
        const diffs: AssetChange[] = [];
        if (before) {
          const next = [
            makeChange(before.id, 'name', before.name, input.name),
            makeChange(before.id, 'brand', before.brand, input.brand),
            makeChange(before.id, 'model', before.model, input.model),
            makeChange(before.id, 'manufactureYear', before.manufactureYear, input.manufactureYear),
            makeChange(before.id, 'purchaseYear', before.purchaseYear, input.purchaseYear),
            makeChange(before.id, 'km', before.usageCurrent, input.usageCurrent),
            makeChange(before.id, 'condition', before.condition, input.condition),
            makeChange(before.id, 'nextServiceAt', before.nextServiceAt, input.nextServiceAt),
            makeChange(before.id, 'usageNextDue', before.usageNextDue, input.usageNextDue),
            makeChange(before.id, 'usageInterval', before.usageInterval, input.usageInterval),
            makeChange(before.id, 'usageEnabled', before.usageEnabled, input.usageEnabled),
            makeChange(before.id, 'scheduleByDate', before.scheduleByDate, input.scheduleByDate),
            makeChange(before.id, 'location', before.location, input.location),
          ];
          for (const row of next) if (row) diffs.push(row);
        }
        mutate((prev) => {
          if (input.id) {
            id = input.id;
            return {
              ...prev,
          changes: diffs.length ? [...diffs, ...(prev.changes ?? [])] : prev.changes ?? [],
              assets: prev.assets.map((a) =>
                a.id === input.id
                  ? {
                      ...a,
                      ...input,
                      updatedAt: now,
                    }
                  : a
              ),
            };
          }
          id = nid('asset');
          const asset: Asset = {
            id: id!,
            name: input.name,
            type: input.type,
            brand: input.brand.trim(),
            model: input.model.trim(),
            manufactureYear: input.manufactureYear,
            purchaseYear: input.purchaseYear,
            purchaseAt: input.purchaseAt ?? '',
            condition: input.condition,
            location: input.location ?? 'home',
            nextServiceAt: input.nextServiceAt,
            scheduleByDate: input.scheduleByDate,
            usageEnabled: input.usageEnabled,
            usageCurrent: input.usageCurrent,
            usageInterval: input.usageInterval,
            usageNextDue: input.usageNextDue,
            archived: false,
            createdAt: now,
            updatedAt: now,
          };
          return { ...prev, assets: [asset, ...prev.assets] };
        });
        track(input.id ? 'asset_updated' : 'asset_created', { assetId: id });
        return id!;
      },
      archiveAsset: (id) => {
        mutate((prev) => ({
          ...prev,
          assets: prev.assets.map((a) =>
            a.id === id ? { ...a, archived: true, updatedAt: todayIso() } : a
          ),
        }));
        track('asset_archived', { assetId: id });
      },
      restoreAsset: (id) => {
        mutate((prev) => ({
          ...prev,
          assets: prev.assets.map((a) =>
            a.id === id ? { ...a, archived: false, updatedAt: todayIso() } : a
          ),
        }));
        track('asset_restored', { assetId: id });
      },
      permanentlyDeleteAsset: (id) => {
        mutate((prev) => ({
          ...prev,
          assets: prev.assets.filter((a) => a.id !== id),
          logs: prev.logs.filter((l) => l.assetId !== id),
          changes: (prev.changes ?? []).filter((c) => c.assetId !== id),
        }));
        track('asset_deleted', { assetId: id });
      },
      setCondition: (id, condition) => {
        const before = s.assets.find((a) => a.id === id);
        const row = before ? makeChange(id, 'condition', before.condition, condition) : null;
        if (!row) return;
        mutate((prev) => ({
          ...prev,
          changes: [row, ...(prev.changes ?? [])],
          assets: prev.assets.map((a) =>
            a.id === id ? { ...a, condition, updatedAt: todayIso() } : a
          ),
        }));
        track('condition_changed', { assetId: id, oldValue: before?.condition, newValue: condition });
      },
      setLocation: (id, location) => {
        const before = s.assets.find((a) => a.id === id);
        const row = before ? makeChange(id, 'location', before.location, location) : null;
        if (!row) return;
        mutate((prev) => ({
          ...prev,
          changes: [row, ...(prev.changes ?? [])],
          assets: prev.assets.map((a) =>
            a.id === id ? { ...a, location, updatedAt: todayIso() } : a
          ),
        }));
        track('location_changed', { assetId: id, oldValue: before?.location, newValue: location });
      },
      updateUsage: (id, usageCurrent) => {
        const before = s.assets.find((a) => a.id === id);
        const row = before ? makeChange(id, 'km', before.usageCurrent, usageCurrent) : null;
        if (!row) return;
        mutate((prev) => ({
          ...prev,
          changes: [row, ...(prev.changes ?? [])],
          assets: prev.assets.map((a) =>
            a.id === id ? { ...a, usageCurrent, updatedAt: todayIso() } : a
          ),
        }));
        track('usage_updated', {
          assetId: id,
          oldValue: before?.usageCurrent ?? null,
          newValue: usageCurrent,
        });
      },
      logService: (input) => {
        const log: ServiceLog = {
          id: nid('log'),
          assetId: input.assetId,
          servicedAt: input.servicedAt,
          serviceKind: input.serviceKind,
          notes: input.notes,
          cost: input.cost,
          receiptUri: input.receiptUri,
          serviceTagUri: input.serviceTagUri,
          vendorId: input.vendorId,
          vendorName: input.vendorName,
          createdAt: new Date().toISOString(),
        };
        mutate((prev) => ({
          ...prev,
          logs: [log, ...prev.logs],
          assets: prev.assets.map((a) => {
            if (a.id !== input.assetId) return a;
            if (input.serviceKind !== 'routine') {
              return { ...a, location: 'home', updatedAt: todayIso() };
            }
            const patch: Partial<Asset> = { location: 'home', updatedAt: todayIso() };
            if (input.scheduleByDate != null) patch.scheduleByDate = input.scheduleByDate;
            if (input.usageEnabled != null) patch.usageEnabled = input.usageEnabled;
            if (input.usageInterval != null) patch.usageInterval = input.usageInterval;
            if (input.usageCurrent != null) patch.usageCurrent = input.usageCurrent;

            const byDate =
              (input.scheduleByDate != null ? input.scheduleByDate : a.scheduleByDate) !== false;
            const byKm = input.usageEnabled != null ? input.usageEnabled : a.usageEnabled;

            if (byDate && input.nextServiceAt) patch.nextServiceAt = input.nextServiceAt;
            if (byKm && input.usageNextDue != null) patch.usageNextDue = input.usageNextDue;
            return { ...a, ...patch };
          }),
        }));
        track('service_logged', {
          assetId: input.assetId,
          serviceKind: input.serviceKind,
          hasCost: input.cost != null,
          hasReceipt: !!input.receiptUri,
          hasServiceTag: !!input.serviceTagUri,
        });
      },
      updateLogPhotos: (logId, patch) => {
        mutate((prev) => ({
          ...prev,
          logs: prev.logs.map((log) => {
            if (log.id !== logId) return log;
            return {
              ...log,
              ...(patch.receiptUri !== undefined ? { receiptUri: patch.receiptUri } : {}),
              ...(patch.serviceTagUri !== undefined ? { serviceTagUri: patch.serviceTagUri } : {}),
            };
          }),
        }));
        track('service_photos_updated', {
          logId,
          receipt: patch.receiptUri !== undefined,
          serviceTag: patch.serviceTagUri !== undefined,
        });
      },
      addVendor: (name) => {
        const vendor: Vendor = {
          id: nid('vendor'),
          name: name.trim(),
          isSeed: false,
          createdAt: todayIso(),
        };
        mutate((prev) => ({ ...prev, vendors: [...prev.vendors, vendor] }));
        track('vendor_added', { vendorId: vendor.id });
        return vendor;
      },
      track,
      resetDemo: () => {
        const next = sampleState(s.language);
        void clearState().then(() => setState(next));
      },
      loadSampleData: () => {
        setState(sampleState(s.language));
        track('starter_sample');
      },
      startEmpty: () => {
        setState(blankState(s.language));
        track('starter_empty');
      },
      importState: async (next) => {
        const merged: AppState = {
          ...emptyState(),
          ...next,
          logs: (next.logs ?? []).map((log) => ({
            ...log,
            serviceTagUri: log.serviceTagUri ?? null,
          })),
          assets: (next.assets ?? []).map((a) =>
            normalizeAsset(a as Asset & { serviceOverride?: 'in_service' | null })
          ),
          changes: next.changes ?? [],
          vendors: mergeSeedVendors(next.vendors?.length ? next.vendors : [...SEED_VENDORS]),
          homeColumns: next.homeColumns === 3 ? 3 : 2,
        };
        await markDirty();
        await saveState(merged);
        setState(merged);
      },
      logsFor: (assetId) => s.logs.filter((l) => l.assetId === assetId),
      changesFor: (assetId) => (s.changes ?? []).filter((c) => c.assetId === assetId),
    };
  }, [
    ready,
    state,
    mutate,
    track,
    syncStatus,
    syncMeta,
    lastSyncError,
    syncConflict,
    syncNow,
    resolveSyncKeepLocal,
    resolveSyncUseCloud,
    applyRemoteState,
  ]);

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets() {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error('useAssets must be used within AssetProvider');
  return ctx;
}
