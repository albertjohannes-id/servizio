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
import { AppState } from '../domain/types';
import { createSeedAssets, SEED_VENDORS } from './seed';

export const STORAGE_DRIVER = 'local' as const;

const KEY = 'servizio_v1_state';

export function emptyState(): AppState {
  return {
    assets: createSeedAssets(),
    logs: [],
    vendors: [...SEED_VENDORS],
    events: [],
    changes: [],
    language: 'en',
  };
}

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.assets || !parsed.vendors) return emptyState();
    return {
      ...emptyState(),
      ...parsed,
      logs: (parsed.logs ?? []).map((log) => ({
        ...log,
        serviceTagUri: log.serviceTagUri ?? null,
      })),
      assets: (parsed.assets ?? []).map((a) => ({
        ...a,
        brand: a.brand ?? '',
        model: a.model ?? '',
        manufactureYear: a.manufactureYear ?? null,
        purchaseYear: a.purchaseYear ?? null,
      })),
      changes: parsed.changes ?? [],
      vendors: parsed.vendors.length ? parsed.vendors : [...SEED_VENDORS],
    };
  } catch {
    return emptyState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
