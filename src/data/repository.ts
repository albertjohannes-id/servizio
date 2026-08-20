/**
 * Local-only persistence for MVP.
 *
 * Driver: AsyncStorage on native, localStorage via the same API on web.
 * No remote database. No Supabase client in this phase.
 *
 * Phase 1.1: swap this module for a Supabase repository that upserts
 * the same AppState shape (assets, service_logs, vendors) to Postgres.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Asset, AssetLocation } from '../domain/types';
import { createSeedAssets, mergeSeedVendors, SEED_VENDORS } from './seed';

export const STORAGE_DRIVER = 'local' as const;

const KEY = 'servizio_v1_state';

export function blankState(language: AppState['language'] = 'en'): AppState {
  return {
    assets: [],
    logs: [],
    vendors: [...SEED_VENDORS],
    events: [],
    changes: [],
    language,
    homeColumns: 2,
  };
}

export function sampleState(language: AppState['language'] = 'en'): AppState {
  return {
    ...blankState(language),
    assets: createSeedAssets(),
  };
}

export function normalizeAsset(
  a: Asset & { serviceOverride?: 'in_service' | null }
): Asset {
  const location: AssetLocation =
    a.location === 'service_center' || a.serviceOverride === 'in_service'
      ? 'service_center'
      : 'home';
  return {
    ...a,
    brand: a.brand ?? '',
    model: a.model ?? '',
    manufactureYear: a.manufactureYear ?? null,
    purchaseYear: a.purchaseYear ?? null,
    purchaseAt: a.purchaseAt ?? '',
    scheduleByDate: a.scheduleByDate !== false,
    location,
  };
}

/** Defaults used when merging loaded JSON. Fresh installs start blank (no sample assets). */
export function emptyState(): AppState {
  return blankState();
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.assets || !parsed.vendors) return blankState();
    return {
      ...blankState(),
      ...parsed,
      logs: (parsed.logs ?? []).map((log) => ({
        ...log,
        serviceTagUri: log.serviceTagUri ?? null,
        serviceKind: log.serviceKind === 'one_time' ? 'one_time' : 'routine',
      })),
      assets: (parsed.assets ?? []).map((a) =>
        normalizeAsset(a as Asset & { serviceOverride?: 'in_service' | null })
      ),
      changes: parsed.changes ?? [],
      vendors: mergeSeedVendors(parsed.vendors.length ? parsed.vendors : [...SEED_VENDORS]),
      homeColumns: parsed.homeColumns === 3 ? 3 : 2,
    };
  } catch {
    return blankState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
