# Expo web → Cloudflare Pages

Static SPA. No server.

## Build

```bash
npx expo export --platform web
```

Output: `dist/` (`index.html`, `_expo/static`, `_redirects` from `public/_redirects`).

`app.json` must keep:

```json
"web": { "bundler": "metro", "output": "single" }
```

## Pages settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | repository root |
| Build command | `npx expo export --platform web` |
| Build output | `dist` |
| Node | 20 |

SPA fallback (`public/_redirects`):

```
/*    /index.html   200
```

Host at site root. Subpaths need extra `baseUrl` work — skip for MVP.

## Local production preview

```bash
npx expo export --platform web
npx expo serve
```

OS notifications are native-only. Persistence is localStorage on web.
