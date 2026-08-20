# Servizio API (Cloudflare Worker + D1)

## Local

```bash
cd api
npm install
npx wrangler d1 execute servizio --local --file=./schema.sql
npm run dev
```

API: `http://127.0.0.1:8787`

Without Resend, `ALLOW_OTP_IN_RESPONSE=true` returns `devOtp` in the JSON for local testing.

## Production (current)

| Piece | Value |
|-------|--------|
| Worker | `servizio-api` → https://servizio-api.albertjohannes-id.workers.dev |
| D1 | `servizio` (APAC), binding `DB` |
| R2 | `servizio-photos` (APAC), binding `PHOTOS` — receipt + service-tag images |
| From | `Servizio <noreply@inovateks.id>` (domain verified in Resend; DNS can live on Hostinger or Cloudflare) |
| Secret | `RESEND_API_KEY` on **`servizio-api` only** |
| OTP | 10 min TTL; HTML + text email; client resend cooldown ~45s; rate limit ~8/hour/email |
| Media | `PUT /media?kind=receipt\|service_tag&logId=` (max 5MB); `GET /media?key=` (user-scoped). `/health` reports `photos: true` when bound. |

```bash
npx wrangler secret put RESEND_API_KEY   # run from api/ so Worker name is servizio-api
npm run deploy
```

Create D1 (once) with location hint if desired:

```bash
npx wrangler d1 create servizio --location apac
# paste database_id into wrangler.jsonc
npx wrangler d1 execute servizio --remote --file=./schema.sql
```

Region is chosen at **create** time (`--location`), not on `d1 execute`.

Set `ALLOW_OTP_IN_RESPONSE` to `"false"` in production. Keep `ALLOWED_ORIGINS` in sync with the web app origin(s).

## Client

Set `EXPO_PUBLIC_API_URL` to the Worker URL (baked in at `expo export` time for public web).
