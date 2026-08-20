import { Env, error, isEmail, nid, nowIso, otpCode, sha256Hex } from './util';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 8;

type UserRow = {
  id: string;
  email: string;
  email_verified: number;
  verified_at: string | null;
  created_at: string;
};

export async function getUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<UserRow>();
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
}

async function bumpRateLimit(db: D1Database, key: string): Promise<boolean> {
  const now = Date.now();
  const row = await db
    .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; window_start: string }>();
  if (!row) {
    await db
      .prepare('INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)')
      .bind(key, new Date(now).toISOString())
      .run();
    return true;
  }
  const start = Date.parse(row.window_start);
  if (Number.isNaN(start) || now - start > RATE_WINDOW_MS) {
    await db
      .prepare('UPDATE rate_limits SET count = 1, window_start = ? WHERE key = ?')
      .bind(new Date(now).toISOString(), key)
      .run();
    return true;
  }
  if (row.count >= RATE_MAX) return false;
  await db
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
    .bind(key)
    .run();
  return true;
}

export async function ensureDevice(db: D1Database, userId: string, deviceId: string): Promise<void> {
  const existing = await db
    .prepare('SELECT id FROM devices WHERE user_id = ? AND device_id = ?')
    .bind(userId, deviceId)
    .first();
  const ts = nowIso();
  if (existing) {
    await db
      .prepare('UPDATE devices SET last_seen_at = ? WHERE user_id = ? AND device_id = ?')
      .bind(ts, userId, deviceId)
      .run();
    return;
  }
  await db
    .prepare(
      'INSERT INTO devices (id, user_id, device_id, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(nid('dev'), userId, deviceId, ts, ts)
    .run();
}

export async function createSession(
  db: D1Database,
  userId: string,
  deviceId: string
): Promise<{ accessToken: string; refreshToken: string; accessExpiresAt: string }> {
  const accessToken = crypto.randomUUID().replace(/-/g, '') + randomHex(16);
  const refreshToken = crypto.randomUUID().replace(/-/g, '') + randomHex(16);
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO sessions
      (id, user_id, device_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      nid('ses'),
      userId,
      deviceId,
      await sha256Hex(accessToken),
      await sha256Hex(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      nowIso()
    )
    .run();
  return { accessToken, refreshToken, accessExpiresAt };
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sessionFromAccess(
  db: D1Database,
  accessToken: string
): Promise<{ userId: string; deviceId: string } | null> {
  const hash = await sha256Hex(accessToken);
  const row = await db
    .prepare(
      `SELECT user_id, device_id, access_expires_at FROM sessions WHERE access_token_hash = ?`
    )
    .bind(hash)
    .first<{ user_id: string; device_id: string; access_expires_at: string }>();
  if (!row) return null;
  if (Date.parse(row.access_expires_at) < Date.now()) return null;
  return { userId: row.user_id, deviceId: row.device_id };
}

export async function handleCheckEmail(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) return error('invalid_email');
  const user = await getUserByEmail(env.DB, email);
  return Response.json({
    exists: !!user,
    emailVerified: user ? user.email_verified === 1 : false,
  });
}

export async function handleRegister(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string; deviceId?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  const deviceId = (body.deviceId ?? '').trim();
  if (!isEmail(email)) return error('invalid_email');
  if (!deviceId) return error('device_id_required');

  const existing = await getUserByEmail(env.DB, email);
  if (existing) {
    return error('email_exists', 409, { exists: true, emailVerified: existing.email_verified === 1 });
  }

  const userId = nid('usr');
  const ts = nowIso();
  await env.DB.prepare(
    'INSERT INTO users (id, email, email_verified, verified_at, created_at) VALUES (?, ?, 0, NULL, ?)'
  )
    .bind(userId, email, ts)
    .run();
  await ensureDevice(env.DB, userId, deviceId);
  await env.DB.prepare(
    `INSERT INTO sync_state (user_id, blob_json, revision, updated_at, updated_by_device_id)
     VALUES (?, ?, 0, ?, ?)`
  )
    .bind(userId, JSON.stringify({ assets: [], logs: [], vendors: [], changes: [], events: [], language: 'en', homeColumns: 2 }), ts, deviceId)
    .run();

  return Response.json({
    userId,
    email,
    emailVerified: false,
  });
}

async function sendResend(env: Env, email: string, code: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const from = env.RESEND_FROM || 'Servizio <onboarding@resend.dev>';
  const text = [
    `Your Servizio verification code is ${code}.`,
    '',
    'It expires in 10 minutes.',
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');
  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#F3F1EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1C1A17;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;margin:0 auto;background:#ffffff;border:1px solid #E4DFD6;border-radius:12px;">
    <tr>
      <td style="padding:28px 28px 8px;">
        <p style="margin:0;font-size:14px;letter-spacing:0.4px;text-transform:uppercase;color:#6B6560;">Servizio</p>
        <h1 style="margin:12px 0 0;font-size:22px;font-weight:500;letter-spacing:-0.3px;">Your verification code</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 28px 20px;">
        <p style="margin:0;font-size:36px;font-weight:600;letter-spacing:6px;font-variant-numeric:tabular-nums;">${code}</p>
        <p style="margin:16px 0 0;font-size:15px;line-height:22px;color:#6B6560;">This code expires in <strong style="color:#1C1A17;">10 minutes</strong>.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 28px 28px;">
        <p style="margin:0;font-size:13px;line-height:18px;color:#8A847C;">If you did not request this, you can ignore this email.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Your Servizio code: ${code}`,
      text,
      html,
    }),
  });
  return res.ok;
}

export async function handleRequestOtp(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string; deviceId?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) return error('invalid_email');

  const allowed = await bumpRateLimit(env.DB, `otp:${email}`);
  if (!allowed) return error('rate_limited', 429);

  const code = otpCode();
  const codeHash = await sha256Hex(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
  await env.DB.prepare(
    `INSERT INTO otp_challenges (id, email, code_hash, expires_at, used_at, attempt_count, created_at)
     VALUES (?, ?, ?, ?, NULL, 0, ?)`
  )
    .bind(nid('otp'), email, codeHash, expiresAt, nowIso())
    .run();

  const sent = await sendResend(env, email, code);
  const payload: Record<string, unknown> = {
    ok: true,
    sent,
    expiresAt,
  };
  if (!sent && env.ALLOW_OTP_IN_RESPONSE === 'true') {
    payload.devOtp = code;
  }
  if (!sent && env.ALLOW_OTP_IN_RESPONSE !== 'true' && !env.RESEND_API_KEY) {
    return error('email_not_configured', 503);
  }
  return Response.json(payload);
}

export async function handleVerifyOtp(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { email?: string; code?: string; deviceId?: string };
  const email = (body.email ?? '').trim().toLowerCase();
  const code = (body.code ?? '').trim();
  const deviceId = (body.deviceId ?? '').trim();
  if (!isEmail(email)) return error('invalid_email');
  if (!/^\d{6}$/.test(code)) return error('invalid_code');
  if (!deviceId) return error('device_id_required');

  const challenge = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, used_at, attempt_count FROM otp_challenges
     WHERE email = ? AND used_at IS NULL
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(email)
    .first<{
      id: string;
      code_hash: string;
      expires_at: string;
      used_at: string | null;
      attempt_count: number;
    }>();

  if (!challenge) return error('otp_not_found', 404);
  if (Date.parse(challenge.expires_at) < Date.now()) return error('otp_expired', 410);
  if (challenge.attempt_count >= OTP_MAX_ATTEMPTS) return error('otp_locked', 429);

  const hash = await sha256Hex(code);
  if (hash !== challenge.code_hash) {
    await env.DB.prepare('UPDATE otp_challenges SET attempt_count = attempt_count + 1 WHERE id = ?')
      .bind(challenge.id)
      .run();
    return error('otp_invalid', 401);
  }

  await env.DB.prepare('UPDATE otp_challenges SET used_at = ? WHERE id = ?')
    .bind(nowIso(), challenge.id)
    .run();

  let user = await getUserByEmail(env.DB, email);
  const ts = nowIso();
  if (!user) {
    const userId = nid('usr');
    await env.DB.prepare(
      'INSERT INTO users (id, email, email_verified, verified_at, created_at) VALUES (?, ?, 1, ?, ?)'
    )
      .bind(userId, email, ts, ts)
      .run();
    await env.DB.prepare(
      `INSERT INTO sync_state (user_id, blob_json, revision, updated_at, updated_by_device_id)
       VALUES (?, ?, 0, ?, ?)`
    )
      .bind(
        userId,
        JSON.stringify({
          assets: [],
          logs: [],
          vendors: [],
          changes: [],
          events: [],
          language: 'en',
          homeColumns: 2,
        }),
        ts,
        deviceId
      )
      .run();
    user = await getUserById(env.DB, userId);
  } else if (user.email_verified !== 1) {
    await env.DB.prepare('UPDATE users SET email_verified = 1, verified_at = ? WHERE id = ?')
      .bind(ts, user.id)
      .run();
  }

  if (!user) return error('user_missing', 500);
  await ensureDevice(env.DB, user.id, deviceId);
  const session = await createSession(env.DB, user.id, deviceId);

  const sync = await env.DB.prepare(
    'SELECT revision, updated_at, blob_json FROM sync_state WHERE user_id = ?'
  )
    .bind(user.id)
    .first<{ revision: number; updated_at: string; blob_json: string }>();

  return Response.json({
    userId: user.id,
    email,
    emailVerified: true,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    accessExpiresAt: session.accessExpiresAt,
    sync: sync
      ? {
          revision: sync.revision,
          updatedAt: sync.updated_at,
          hasData: sync.revision > 0 || (sync.blob_json?.length ?? 0) > 80,
          blob: JSON.parse(sync.blob_json),
        }
      : { revision: 0, updatedAt: ts, hasData: false, blob: null },
  });
}

export async function handleRefresh(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { refreshToken?: string; deviceId?: string };
  const refreshToken = (body.refreshToken ?? '').trim();
  const deviceId = (body.deviceId ?? '').trim();
  if (!refreshToken || !deviceId) return error('invalid_request');

  const hash = await sha256Hex(refreshToken);
  const row = await env.DB.prepare(
    `SELECT id, user_id, device_id, refresh_expires_at FROM sessions WHERE refresh_token_hash = ?`
  )
    .bind(hash)
    .first<{ id: string; user_id: string; device_id: string; refresh_expires_at: string }>();

  if (!row) return error('invalid_refresh', 401);
  if (row.device_id !== deviceId) return error('device_mismatch', 401);
  if (Date.parse(row.refresh_expires_at) < Date.now()) return error('refresh_expired', 401);

  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(row.id).run();
  await ensureDevice(env.DB, row.user_id, deviceId);
  const session = await createSession(env.DB, row.user_id, deviceId);
  return Response.json(session);
}
