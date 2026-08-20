# Servizio

Personal asset service tracker for cars, motorcycles, AC, water heaters, and similar gear. One place for **condition**, **next service**, **location**, and **history** — so dates are not scattered across calendar apps.

Built by [Inovateks](https://github.com/albertjohannes-id).

## Run locally

```bash
npm install
npm run web          # http://localhost:8081 — use a real browser, not an IDE preview
npm start            # Expo: iOS / Android / Expo Go
```

Requires Node 20+. Copy `.env.example` to `.env` so the app can reach the local API.

## API (cloud sync)

```bash
cd api
npm install
npm run db:local
npm run dev          # http://127.0.0.1:8787
```

Without Resend, local OTP is returned as `devOtp` in the JSON (`ALLOW_OTP_IN_RESPONSE=true`). PIN never leaves the device.

## What this MVP does

- **Local 6-digit PIN** (hashed on device). Locks after 1 hour idle. PIN is never sent to the server.
- **Email-first setup:** new emails create a local PIN (and an unverified cloud user when online). Existing emails always verify with OTP, then create a PIN on this device. Account shows verified / unverified and can verify later.
- **Cloud sync (1.1):** after OTP, D1 holds the authoritative JSON blob; this device keeps an offline working copy and pushes when dirty. Revision conflicts ask Use cloud / Keep mine.
- **Photo sync (1.2):** receipt + service-tag images upload to R2 on sync; history detail sheet can attach / change / remove photos without a new log.
- JSON **export / import** from Account (photo **bytes** not embedded; `r2:` / local URI strings only).
- Assets: kind, name, brand, type/model, manufacture year, purchase year, purchase-at.
- **Condition** (working / needs attention / not working), **schedule** (on track / due soon / overdue), and **location** (home / service center) are separate.
- **Dual schedule** for vehicles: track by **date**, by **km**, or **both** — or **Not yet** (register first, add schedule later; default for new assets).
- Home dashboard: status-colored tiles with plain-language maintenance lines, e.g. `Service in 45 days` and `Service in 500 km`. Compact 3-column grid merges both into one line (`In 45 days · 500 km`).
- Account → Appearance chooses **2 or 3** tiles per row.
- **Log service** — single manual form: service date, **routine vs one-off** (one-off does not change schedule), next due date with **+1…+6 month** shortcuts from service date, optional next km, notes, cost, receipt + service-tag photos (tap to view full size), vendor.
- **Log km** — separate odometer update for car / motorcycle / bike (works even before km reminders are enabled).
- OTP: Resend from `noreply@inovateks.id`; **Resend code** in-app with cooldown; 10-minute expiry.
- Searchable vendors; service history and change history (field + from + to); tap photos in history for full-screen view; attach / change / remove receipt and service-tag on the history sheet.
- Required fields marked with `*` on submit forms.
- English / Indonesian.
- Offline edits stay on device until the next successful sync.

## Data

Working copy is one JSON blob on the device. After email verification, the same blob is stored in D1 (`sync_state`) with an integer revision.

| Platform | Where |
|---|---|
| Web | `localStorage` key `servizio_v1_state` |
| iOS / Android | AsyncStorage, same key |
| Cloud (verified) | Cloudflare D1 via Worker `servizio-api` |

PIN hash lives in `servizio_v1_auth`. Unlock session in `servizio_v1_unlock`. Cloud tokens in `servizio_v1_cloud_session`. Photos sync via R2 (`servizio-photos`) as `r2:` keys on cloud sync (phase 1.2).

See `api/README.md`, [docs/phase-1.1-cloud-sync.md](docs/phase-1.1-cloud-sync.md), and [docs/phase-1.2-photo-r2.md](docs/phase-1.2-photo-r2.md).

### Model highlights

- `assets.scheduleByDate` — when false, schedule ignores next service date (km-only).
- `logs.serviceKind` — `routine` | `one_time` (one-off visits do not update next due).

## Web host (Cloudflare)

**Live test:** https://servizio.albertjohannes-id.workers.dev (API: https://servizio-api.albertjohannes-id.workers.dev)

```bash
EXPO_PUBLIC_API_URL=https://servizio-api.albertjohannes-id.workers.dev npm run export:web
npx wrangler deploy   # uploads dist/ to Worker "servizio"
```

See [docs/hosting.md](docs/hosting.md). Notifications are native-only; web uses in-app Due Soon / Overdue.

## License

MIT. © 2026 Inovateks.
