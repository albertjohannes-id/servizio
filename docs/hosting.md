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

## Local production preview

```bash
npx expo export --platform web
npx expo serve
```

OS notifications are native-only. Persistence is localStorage on web.
