import { Env, error, nowIso } from './util';
import { sessionFromAccess } from './auth';

function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() || null;
}

export async function handleGetSync(req: Request, env: Env): Promise<Response> {
  const token = bearer(req);
  if (!token) return error('unauthorized', 401);
  const session = await sessionFromAccess(env.DB, token);
  if (!session) return error('unauthorized', 401);

  const row = await env.DB.prepare(
    'SELECT blob_json, revision, updated_at FROM sync_state WHERE user_id = ?'
  )
    .bind(session.userId)
    .first<{ blob_json: string; revision: number; updated_at: string }>();

  if (!row) {
    return Response.json({
      revision: 0,
      updatedAt: nowIso(),
      blob: null,
    });
  }

  return Response.json({
    revision: row.revision,
    updatedAt: row.updated_at,
    blob: JSON.parse(row.blob_json),
  });
}

export async function handlePutSync(req: Request, env: Env): Promise<Response> {
  const token = bearer(req);
  if (!token) return error('unauthorized', 401);
  const session = await sessionFromAccess(env.DB, token);
  if (!session) return error('unauthorized', 401);

  const body = (await req.json()) as { baseRevision?: number; blob?: unknown };
  if (body.blob == null || typeof body.blob !== 'object') return error('blob_required');
  const baseRevision = typeof body.baseRevision === 'number' ? body.baseRevision : -1;

  const row = await env.DB.prepare('SELECT revision FROM sync_state WHERE user_id = ?')
    .bind(session.userId)
    .first<{ revision: number }>();

  const current = row?.revision ?? 0;
  if (baseRevision !== current) {
    return error('conflict', 409, { serverRevision: current });
  }

  const nextRevision = current + 1;
  const ts = nowIso();
  const blobJson = JSON.stringify(body.blob);

  if (row) {
    await env.DB.prepare(
      `UPDATE sync_state SET blob_json = ?, revision = ?, updated_at = ?, updated_by_device_id = ?
       WHERE user_id = ?`
    )
      .bind(blobJson, nextRevision, ts, session.deviceId, session.userId)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO sync_state (user_id, blob_json, revision, updated_at, updated_by_device_id)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(session.userId, blobJson, nextRevision, ts, session.deviceId)
      .run();
  }

  return Response.json({ revision: nextRevision, updatedAt: ts });
}
