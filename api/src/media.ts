import { Env, error, nid } from './util';
import { sessionFromAccess } from './auth';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']);

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}

function extFor(contentType: string): string {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('heic')) return 'heic';
  return 'jpg';
}

export async function handlePutMedia(req: Request, env: Env): Promise<Response> {
  if (!env.PHOTOS) return error('photos_not_configured', 503);
  const token = bearer(req);
  if (!token) return error('unauthorized', 401);
  const session = await sessionFromAccess(env.DB, token);
  if (!session) return error('unauthorized', 401);

  const url = new URL(req.url);
  const kind = (url.searchParams.get('kind') || '').trim();
  const logId = (url.searchParams.get('logId') || '').trim();
  if (kind !== 'receipt' && kind !== 'service_tag') return error('invalid_kind');
  if (!logId || !/^[\w.-]{3,80}$/.test(logId)) return error('invalid_log_id');

  const contentType = (req.headers.get('content-type') || 'image/jpeg').split(';')[0]!.trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) return error('unsupported_media_type', 415);

  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return error('empty_body');
  if (buf.byteLength > MAX_BYTES) return error('too_large', 413);

  const key = `users/${session.userId}/logs/${logId}/${kind}.${extFor(contentType)}`;
  await env.PHOTOS.put(key, buf, {
    httpMetadata: { contentType },
    customMetadata: {
      userId: session.userId,
      deviceId: session.deviceId,
      kind,
      logId,
      uploadedAt: new Date().toISOString(),
      uploadId: nid('up'),
    },
  });

  return Response.json({ key, kind, logId, bytes: buf.byteLength });
}

export async function handleGetMedia(req: Request, env: Env): Promise<Response> {
  if (!env.PHOTOS) return error('photos_not_configured', 503);
  const token = bearer(req);
  if (!token) return error('unauthorized', 401);
  const session = await sessionFromAccess(env.DB, token);
  if (!session) return error('unauthorized', 401);

  const url = new URL(req.url);
  const key = (url.searchParams.get('key') || '').trim();
  if (!key || key.includes('..') || key.startsWith('/')) return error('invalid_key');
  const prefix = `users/${session.userId}/`;
  if (!key.startsWith(prefix)) return error('forbidden', 403);

  const obj = await env.PHOTOS.get(key);
  if (!obj) return error('not_found', 404);

  const headers = new Headers();
  headers.set('content-type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('cache-control', 'private, max-age=3600');
  if (obj.httpEtag) headers.set('etag', obj.httpEtag);

  return new Response(obj.body, { status: 200, headers });
}
