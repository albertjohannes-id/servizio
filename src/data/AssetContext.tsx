import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppEvent,
  AppState,
  Asset,
  AssetChange,
  AssetLocation,
  ChangeField,
  ConditionStatus,
  ServiceLog,
  Vendor,
} from '../domain/types';
import { todayIso } from '../domain/status';
import { blankState, clearState, emptyState, loadState, normalizeAsset, sampleState, saveState } from './repository';
import { createSeedAssets, mergeSeedVendors, SEED_VENDORS } from './seed';

type AssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'archived'> & {
  id?: string;
};

interface AssetContextValue {
  ready: boolean;
  state: AppState;
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
    notes: string;
    cost: number | null;
    receiptUri: string | null;
    serviceTagUri: string | null;
    vendorId: string | null;
    vendorName: string | null;
    nextServiceAt: string;
    usageNextDue: number | null;
  }) => void;
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

  useEffect(() => {
    loadState().then((s) => {
      setState(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready && state) {
      void saveState(state);
    }
  }, [ready, state]);

  const mutate = useCallback((fn: (prev: AppState) => AppState) => {
    setState((prev) => (prev ? fn(prev) : prev));
  }, []);

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
          assets: prev.assets.map((a) =>
            a.id === input.assetId
              ? {
                  ...a,
                  location: 'home',
                  nextServiceAt: input.nextServiceAt,
                  usageNextDue: input.usageNextDue,
                  usageCurrent:
                    a.usageEnabled && a.usageCurrent != null ? a.usageCurrent : a.usageCurrent,
                  updatedAt: todayIso(),
                }
              : a
          ),
        }));
        track('service_logged', {
          assetId: input.assetId,
          hasCost: input.cost != null,
          hasReceipt: !!input.receiptUri,
          hasServiceTag: !!input.serviceTagUri,
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
        await saveState(merged);
        setState(merged);
      },
      logsFor: (assetId) => s.logs.filter((l) => l.assetId === assetId),
      changesFor: (assetId) => (s.changes ?? []).filter((c) => c.assetId === assetId),
    };
  }, [ready, state, mutate, track]);

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets() {
  const ctx = useContext(AssetContext);
  if (!ctx) throw new Error('useAssets must be used within AssetProvider');
  return ctx;
}
