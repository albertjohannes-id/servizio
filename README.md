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
- Home dashboard: status-colored tiles. Account → Appearance chooses 2 or 3 per row.
- Log a visit from a workshop **service tag photo** or by typing. That also returns location to Home.
- Searchable vendors; km log; service history and change history (field + from + to).
- English / Indonesian.
- Data stays on the device (see below).

## Data (no backend yet)

Everything is one JSON blob:

| Platform | Where |
|---|---|
| Web | `localStorage` key `servizio_v1_state` |
| iOS / Android | AsyncStorage, same key |

PIN hash lives in `servizio_v1_auth`. Unlock session in `servizio_v1_unlock`. Clearing the browser or uninstalling the app wipes data. Cloud sync is a later phase (replace `src/data/repository.ts` only).

## Web host (Cloudflare)

```bash
npm run export:web   # writes dist/
```

See [docs/hosting.md](docs/hosting.md). Notifications are native-only; web uses in-app Due Soon / Overdue.

## License

MIT. © 2026 Inovateks.
