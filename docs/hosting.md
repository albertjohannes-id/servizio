# Expo web → Cloudflare Pages

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
| Env vars | `NODE_VERSION` = `20` |

Do not put `wrangler deploy` in the **build** command. Expo only writes `dist/`; Wrangler uploads it.

`wrangler.jsonc` points assets at `./dist` and uses SPA fallback (`not_found_handling: "single-page-application"`). Do **not** add `public/_redirects` with `/* /index.html 200` — Workers treats that as an infinite loop and deploy fails with code 100324.

Host at site root. Subpaths need extra `baseUrl` work — skip for MVP.

The **sync API** is a separate Worker (`api/wrangler.jsonc`, name `servizio-api`). Deploy it independently. **Bake** `EXPO_PUBLIC_API_URL=https://servizio-api.albertjohannes-id.workers.dev` into the web export — env is compile-time for Expo, not a runtime Workers binding on the static site.

Do not put `RESEND_API_KEY` on the static `servizio` Worker; it belongs on **`servizio-api`**.

**Photos (1.2):** R2 bucket `servizio-photos` is bound on `servizio-api` as `PHOTOS`. `/health` reports `photos: true`. No public R2 URLs — the app loads images via authenticated `GET /media`.

**Live:** https://servizio.albertjohannes-id.workers.dev → API https://servizio-api.albertjohannes-id.workers.dev

Manual deploy from repo root of the app:

```bash
npm run deploy:web
# or:
EXPO_PUBLIC_API_URL=https://servizio-api.albertjohannes-id.workers.dev npm run export:web
npx wrangler deploy
# API (when Worker/R2/D1 changes):
cd api && npm run deploy
```

**Important:** `expo export` bakes `EXPO_PUBLIC_API_URL` at build time. Exporting without it leaves `127.0.0.1:8787` in the bundle — phones will show the offline sync banner. Always use `npm run deploy:web` (or set the env var). Cloudflare Git builds must set the same variable.

## Local production preview

```bash
npx expo export --platform web
npx expo serve
```

OS notifications are native-only. Persistence is localStorage on web.
