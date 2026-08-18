# Servizio

Personal asset service tracker for cars, motorcycles, AC, water heaters, and similar gear. One list for **condition**, **next service**, and **history** — so dates are not scattered across calendar apps.

Built by [Inovateks](https://github.com/albertjohannes-id).

## Run locally

```bash
npm install
npm run web          # http://localhost:8081 — use a real browser, not an IDE preview
npm start            # Expo: iOS / Android / Expo Go
```

Requires Node 20+.

## What this MVP does

- Mock login (any valid email, no password, no server)
- Assets with kind, brand, type/model, manufacture year, purchase year
- Dual status: **condition** (manual) and **service** (On Track / Due Soon / Overdue / In Service)
- Log a visit from a workshop **service tag photo** or by typing
- Searchable vendors; km log with old → new; service history and change history
- English / Indonesian
- Data stays on the device (see below)

## Data (no backend yet)

Everything is one JSON blob:

| Platform | Where |
|---|---|
| Web | `localStorage` key `servizio_v1_state` |
| iOS / Android | AsyncStorage, same key |

Assets, vendors, service logs, and change history live in that object. Clearing the browser or uninstalling the app wipes data. Cloud sync is a later phase (replace `src/data/repository.ts` only).

## Web host (Cloudflare Pages)

```bash
npm run export:web   # writes dist/
```

See [docs/hosting.md](docs/hosting.md). Notifications are native-only; web uses in-app Due Soon / Overdue.

## License

MIT. © 2026 Inovateks.
