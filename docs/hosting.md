# Expo web → Cloudflare Workers

Static SPA. No server.

## Build

```bash
npx expo export --platform web
```

Output: `dist/` (`index.html`, `_expo/static`, assets).

`app.json` must keep:

```json
"web": { "bundler": "metro", "output": "single" }
```

## Cloudflare dashboard (Workers Git)

This is **two fields**, not one command. Project name must stay `servizio` (matches `wrangler.jsonc`).

| Field | Value |
|---|---|
| Project name | `servizio` |
| Root directory | `/` |
| Build command | `npx expo export --platform web` |
| Deploy command (production) | `npx wrangler deploy` |
| Non-production builds | `npx wrangler versions upload` (leave default) |
| API token | leave **Create new token** |
| Env vars | `NODE_VERSION` = `20`; `EXPO_PUBLIC_API_URL` = `https://api.servizio.ai.id` |

Do not put `wrangler deploy` in the **build** command. Expo only writes `dist/`; Wrangler uploads it.

`wrangler.jsonc` points assets at `./dist` and uses SPA fallback (`not_found_handling: "single-page-application"`). Do **not** add `public/_redirects` with `/* /index.html 200` — Workers treats that as an infinite loop and deploy fails with code 100324.

Host at site root. Subpaths need extra `baseUrl` work — skip for MVP.

The **sync API** is a separate Worker (`api/wrangler.jsonc`, name `servizio-api`). Deploy it independently. **Bake** `EXPO_PUBLIC_API_URL=https://api.servizio.ai.id` into the web export — env is compile-time for Expo, not a runtime Workers binding on the static site.

Do not put `RESEND_API_KEY` on the static `servizio` Worker; it belongs on **`servizio-api`**.

**Photos (1.2):** R2 bucket `servizio-photos` is bound on `servizio-api` as `PHOTOS`. `/health` reports `photos: true`. No public R2 URLs — the app loads images via authenticated `GET /media`.

**Live:** https://servizio.ai.id → API https://api.servizio.ai.id

Manual deploy from repo root of the app:

```bash
npm run deploy:web
# or:
EXPO_PUBLIC_API_URL=https://api.servizio.ai.id npm run export:web
npx wrangler deploy
# API (when Worker/R2/D1 changes):
cd api && npm run deploy
```

**Important:** `expo export` bakes `EXPO_PUBLIC_API_URL` at build time. Always use `npm run deploy:web` (or set the env var). Cloudflare Git builds must set the same variable. The production domain and Workers preview hostnames fall back to the production API when this setting is missing or points to localhost; local development still defaults to `127.0.0.1:8787`.

## Local production preview

```bash
npx expo export --platform web
npx expo serve
```

OS notifications are native-only. Persistence is localStorage on web.

## Production domains

The frontend and API custom domains are declared in their respective `wrangler.jsonc` files. The API allows `https://servizio.ai.id` through `ALLOWED_ORIGINS`; the previous Workers frontend remains allowed during migration. Deploy the API before the frontend.

Before deploying, run `npx wrangler whoami` and confirm the account owns the existing Servizio Workers, D1 database, and R2 bucket. If deployment reports that the configured D1 database was not found, check the authenticated account before changing resource IDs or creating a replacement database. Use `npx wrangler login` to authorize the correct account when needed.

After deploying, verify `https://api.servizio.ai.id/health` returns `ok: true` and `photos: true`, and that an OPTIONS request with `Origin: https://servizio.ai.id` returns that origin in `Access-Control-Allow-Origin`. Confirm the frontend loads and its JavaScript bundle targets `https://api.servizio.ai.id`.

Browser storage is scoped to the frontend origin. Users moving from the old Workers URL must sign in again to restore cloud data. Export any unsynced local-only data from the old origin before moving.

### Deployment verified 2026-11-05

- API version: `01fd5aa2-2eb1-45e4-b73b-a886bd9d7b68`.
- Frontend version: `eabdd024-e08c-45fa-b25b-b6cdaa886b84`.
- Frontend and API TypeScript checks passed; production web export succeeded.
- Live API health returned HTTP 200 with `ok: true` and `photos: true`.
- Live OPTIONS `/sync` returned HTTP 204 and allowed `https://servizio.ai.id`, PUT, and the authorization/content-type headers.
- The live frontend bundle matched the local build and contained the new API URL with no old API URL.
- Authenticated OTP, sync, and photo operations were not exercised during this domain deployment.
