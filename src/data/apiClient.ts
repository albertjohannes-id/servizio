import { AppState } from '../domain/types';
import { getOrCreateDeviceId, loadCloudSession, saveCloudSession, CloudSession } from './syncStorage';

export class ApiError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;

  constructor(code: string, status: number, extra?: Record<string, unknown>) {
    super(code);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

function apiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_API_URL : undefined;
  return String(fromEnv || 'http://127.0.0.1:8787').replace(/\/+$/, '');
}

export function isApiConfigured(): boolean {
  return !!apiBase();
}

async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string | null;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('network_error', 0);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(String(data.error || 'request_failed'), res.status, data);
  }
  return data as T;
}

export async function checkEmail(email: string): Promise<{
  exists: boolean;
  emailVerified: boolean;
}> {
  return request('/auth/check-email', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });
}

export async function registerUser(email: string): Promise<{
  userId: string;
  email: string;
  emailVerified: boolean;
}> {
  const deviceId = await getOrCreateDeviceId();
  return request('/auth/register', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), deviceId },
  });
}

export async function requestOtp(email: string): Promise<{
  ok: boolean;
  sent: boolean;
  expiresAt: string;
  devOtp?: string;
}> {
  const deviceId = await getOrCreateDeviceId();
  return request('/auth/request-otp', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), deviceId },
  });
}

export type VerifyOtpResult = {
  userId: string;
  email: string;
  emailVerified: boolean;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  sync: {
    revision: number;
    updatedAt: string;
    hasData: boolean;
    blob: AppState | null;
  };
};

export async function verifyOtp(email: string, code: string): Promise<VerifyOtpResult> {
  const deviceId = await getOrCreateDeviceId();
  const result = await request<VerifyOtpResult>('/auth/verify-otp', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), code, deviceId },
  });
  await saveCloudSession({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: result.accessExpiresAt,
    userId: result.userId,
    email: result.email,
    emailVerified: result.emailVerified,
  });
  return result;
}

async function refreshIfNeeded(session: CloudSession): Promise<CloudSession> {
  if (Date.parse(session.accessExpiresAt) > Date.now() + 60_000) return session;
  const deviceId = await getOrCreateDeviceId();
  const next = await request<{
    accessToken: string;
    refreshToken: string;
    accessExpiresAt: string;
  }>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: session.refreshToken, deviceId },
  });
  const updated: CloudSession = {
    ...session,
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    accessExpiresAt: next.accessExpiresAt,
  };
  await saveCloudSession(updated);
  return updated;
}

export async function getSync(): Promise<{
  revision: number;
  updatedAt: string;
  blob: AppState | null;
}> {
  let session = await loadCloudSession();
  if (!session) throw new ApiError('not_linked', 401);
  session = await refreshIfNeeded(session);
  return request('/sync', { token: session.accessToken });
}

export async function putSync(
  baseRevision: number,
  blob: AppState
): Promise<{ revision: number; updatedAt: string }> {
  let session = await loadCloudSession();
  if (!session) throw new ApiError('not_linked', 401);
  session = await refreshIfNeeded(session);
  return request('/sync', {
    method: 'PUT',
    token: session.accessToken,
    body: { baseRevision, blob },
  });
}

export async function uploadMedia(
  kind: 'receipt' | 'service_tag',
  logId: string,
  body: ArrayBuffer,
  contentType: string
): Promise<{ key: string }> {
  let session = await loadCloudSession();
  if (!session) throw new ApiError('not_linked', 401);
  session = await refreshIfNeeded(session);

  let res: Response;
  try {
    res = await fetch(
      `${apiBase()}/media?kind=${encodeURIComponent(kind)}&logId=${encodeURIComponent(logId)}`,
      {
        method: 'PUT',
        headers: {
          authorization: `Bearer ${session.accessToken}`,
          'content-type': contentType || 'image/jpeg',
        },
        body,
      }
    );
  } catch {
    throw new ApiError('network_error', 0);
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(String(data.error || 'upload_failed'), res.status, data);
  return { key: String(data.key) };
}

export async function fetchMediaBlob(key: string): Promise<Blob> {
  let session = await loadCloudSession();
  if (!session) throw new ApiError('not_linked', 401);
  session = await refreshIfNeeded(session);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}/media?key=${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
  } catch {
    throw new ApiError('network_error', 0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new ApiError(String(data.error || 'media_fetch_failed'), res.status, data);
  }
  return res.blob();
}

