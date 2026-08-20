# Servizio

Personal asset service tracker for cars, motorcycles, AC, water heaters, and similar gear. One place for **condition**, **next service**, **location**, and **history** — so dates are not scattered across calendar apps.

Built by [Inovateks](https://github.com/albertjohannes-id).

## Run locally

```bash
npm install
npm run web          # http://localhost:8081 — use a real browser, not an IDE preview
npm start            # Expo: iOS / Android / Expo Go
```

Requires Node 20+.

## What this MVP does

- **Local 6-digit PIN** (hashed on device). Locks after 1 hour idle. Email is stored locally for a later cloud-sync phase.
- JSON **export / import** from Account (photos are not included).
- Assets: kind, name, brand, type/model, manufacture year, purchase year, purchase-at.
- **Condition** (working / needs attention / not working), **schedule** (on track / due soon / overdue), and **location** (home / service center) are separate.
- **Dual schedule** for vehicles: track by **date**, by **km**, or **both** (car / motorcycle default both).
- Home dashboard: status-colored tiles with plain-language maintenance lines, e.g. `Service in 45 days` and `Service in 500 km`. Compact 3-column grid merges both into one line (`In 45 days · 500 km`).
- Account → Appearance chooses **2 or 3** tiles per row.
- **Log service** — single manual form: service date, **routine vs one-off** (one-off does not change schedule), next due date with **+1…+6 month** shortcuts from service date, optional next km, notes, cost, receipt photo (tap to view full size), vendor.
- **Log km** — separate odometer update for km-tracked assets (keeps distance reminders current without logging a full service visit).
- Searchable vendors; service history and change history (field + from + to); tap photos in history for full-screen view.
- Required fields marked with `*` on submit forms.
- English / Indonesian.
- Data stays on the device (see below).

## Data (no backend yet)

Everything is one JSON blob:

| Platform | Where |
|---|---|
| Web | `localStorage` key `servizio_v1_state` |
| iOS / Android | AsyncStorage, same key |

PIN hash lives in `servizio_v1_auth`. Unlock session in `servizio_v1_unlock`. Clearing the browser or uninstalling the app wipes data. Cloud sync is phase 1.1 (replace `src/data/repository.ts` only).

### Model highlights

- `assets.scheduleByDate` — when false, schedule ignores next service date (km-only).
- `logs.serviceKind` — `routine` | `one_time` (one-off visits do not update next due).

## Web host (Cloudflare)

```bash
npm run export:web   # writes dist/
```

See [docs/hosting.md](docs/hosting.md). Notifications are native-only; web uses in-app Due Soon / Overdue.

## License

MIT. © 2026 Inovateks.
