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
  ChangeField,
  ConditionStatus,
  ServiceLog,
  Vendor,
} from '../domain/types';
import { todayIso } from '../domain/status';
import { clearState, emptyState, loadState, saveState } from './repository';
import { createSeedAssets, SEED_VENDORS } from './seed';

type AssetInput = Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'archived' | 'serviceOverride'> & {
  id?: string;
  serviceOverride?: Asset['serviceOverride'];
};

interface AssetContextValue {
  ready: boolean;
  state: AppState;
  setLanguage: (lang: 'en' | 'id') => void;
  upsertAsset: (input: AssetInput) => string;
  archiveAsset: (id: string) => void;
  setCondition: (id: string, condition: ConditionStatus) => void;
  setInService: (id: string) => void;
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
    };

    return {
      ready,
      state: s,
      setLanguage: (language) => mutate((prev) => ({ ...prev, language })),
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
                      serviceOverride: input.serviceOverride ?? a.serviceOverride,
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
            condition: input.condition,
            serviceOverride: null,
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
      setInService: (id) => {
        const before = s.assets.find((a) => a.id === id);
        if (!before || before.serviceOverride === 'in_service') return;
        const row = makeChange(id, 'in_service', before.serviceOverride, 'in_service');
        mutate((prev) => ({
          ...prev,
          changes: row ? [row, ...(prev.changes ?? [])] : prev.changes ?? [],
          assets: prev.assets.map((a) =>
            a.id === id
              ? { ...a, serviceOverride: 'in_service', updatedAt: todayIso() }
              : a
          ),
        }));
        track('marked_in_service', { assetId: id });
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
                  serviceOverride: null,
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
        const next: AppState = {
          assets: createSeedAssets(),
          logs: [],
          changes: [],
          vendors: [...SEED_VENDORS],
          events: [],
          language: s.language,
        };
        void clearState().then(() => setState(next));
      },
      importState: async (next) => {
        const merged: AppState = {
          ...emptyState(),
          ...next,
          logs: (next.logs ?? []).map((log) => ({
            ...log,
            serviceTagUri: log.serviceTagUri ?? null,
          })),
          assets: (next.assets ?? []).map((a) => ({
            ...a,
            brand: a.brand ?? '',
            model: a.model ?? '',
            manufactureYear: a.manufactureYear ?? null,
            purchaseYear: a.purchaseYear ?? null,
          })),
          changes: next.changes ?? [],
          vendors: next.vendors?.length ? next.vendors : [...SEED_VENDORS],
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
