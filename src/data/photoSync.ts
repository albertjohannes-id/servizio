import { AppState, ServiceLog } from '../domain/types';
import { ApiError, fetchMediaBlob, uploadMedia } from './apiClient';
import { isLocalPhotoUri, isR2Uri, r2KeyFromUri, toR2Uri, MediaKind } from './photoUri';
import { loadCloudSession } from './syncStorage';

const displayCache = new Map<string, string>();

async function readLocalBytes(
  uri: string
): Promise<{ buffer: ArrayBuffer; contentType: string } | null> {
  try {
    const res = await fetch(uri);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();
    if (!buffer.byteLength) return null;
    return { buffer, contentType };
  } catch {
    return null;
  }
}

async function uploadOne(
  logId: string,
  kind: MediaKind,
  uri: string | null
): Promise<string | null> {
  if (!uri) return null;
  if (isR2Uri(uri)) return uri;
  if (!isLocalPhotoUri(uri)) return uri;

  const local = await readLocalBytes(uri);
  if (!local) return uri; // keep local pointer if read fails

  try {
    const uploaded = await uploadMedia(kind, logId, local.buffer, local.contentType);
    return toR2Uri(uploaded.key);
  } catch (err) {
    if (err instanceof ApiError && (err.code === 'network_error' || err.code === 'not_linked')) {
      return uri;
    }
    throw err;
  }
}

/** Upload any local receipt/service-tag photos, rewriting URIs to `r2:` keys. */
export async function uploadPendingPhotos(state: AppState): Promise<{
  state: AppState;
  changed: boolean;
}> {
  const session = await loadCloudSession();
  if (!session) return { state, changed: false };

  let changed = false;
  const logs: ServiceLog[] = [];
  for (const log of state.logs) {
    const receiptUri = await uploadOne(log.id, 'receipt', log.receiptUri);
    const serviceTagUri = await uploadOne(log.id, 'service_tag', log.serviceTagUri);
    if (receiptUri !== log.receiptUri || serviceTagUri !== log.serviceTagUri) changed = true;
    logs.push({ ...log, receiptUri, serviceTagUri });
  }

  if (!changed) return { state, changed: false };
  return { state: { ...state, logs }, changed: true };
}

/** Strip leftover local-only photo URIs before sending the blob to D1. */
export function stripLocalPhotoUris(state: AppState): AppState {
  return {
    ...state,
    logs: state.logs.map((log) => ({
      ...log,
      receiptUri: isLocalPhotoUri(log.receiptUri) ? null : log.receiptUri,
      serviceTagUri: isLocalPhotoUri(log.serviceTagUri) ? null : log.serviceTagUri,
    })),
  };
}

/** Resolve `r2:` keys (or local URIs) to something Image can display. */
export async function resolveDisplayUri(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  if (!isR2Uri(uri)) return uri;

  const cached = displayCache.get(uri);
  if (cached) return cached;

  const key = r2KeyFromUri(uri);
  if (!key) return null;

  try {
    const blob = await fetchMediaBlob(key);
    const objectUrl = URL.createObjectURL(blob);
    displayCache.set(uri, objectUrl);
    return objectUrl;
  } catch {
    return null;
  }
}
