# Servizio — agent notes

This file is the source of truth for **any** coding agent (Claude Code, Cursor, Copilot, Gemini, Codex, Aider, etc.). Tool-specific stubs (`CLAUDE.md`, `.github/copilot-instructions.md`) only point here.

## Product

Servizio is a **personal Asset Command Center** (not a shop marketplace, not a spend tracker first). People forget service dates; calendar is the current workaround.

- Users: multi-asset personal owners (renters included). Not B2B fleets.
- Three independent axes (do not merge them):
  - **Condition** — Working / Needs Attention / Not Working (how it feels, manual).
  - **Schedule** — On Schedule / Due Soon / Overdue (from next-service date and/or km).
  - **Location** — Home / Service Center (where it is). Logging a service sets location back to Home.
- Due Soon: 14 days or ~10% of km interval left.
- **Schedule tracking per asset** (`ScheduleModePicker` on add/edit):
  - **By date** / **By km** / **Date and km** / **Not yet** (no reminders; neutral tile on home).
  - New assets default to **Not yet**.
  - Untracked assets: banner on detail with **Add schedule**; first **routine log service** can set up reminders inline.
- **Log service** — single manual form (no OCR):
  - Service date (required), **routine vs one-off** (`serviceKind`: `routine` | `one_time`).
  - Routine: updates next due date and/or next km depending on asset setup; one-off does not change schedule.
  - Next service date: date picker + **+1…+6 month** quick chips from service date.
  - Optional notes, cost, **receipt** and **service tag** photos (tap for full screen), vendor.
- **Log km** — separate screen from Log service; updates `usageCurrent` only (change history). Available for **km-capable kinds** (car / motorcycle / bike) even if schedule is still **Not yet** (does not force `usageEnabled`).
- OTP email via **Resend** (`noreply@inovateks.id` in prod). Client shows **Resend code** with ~45s cooldown; codes expire in **10 minutes** (server-enforced).
- JSON backup/export on Account; **binary photos are not in the JSON** (export keeps `r2:` keys / local URIs as strings only). Archive is soft-hide; Account → Archived assets can restore or permanently delete.
- First run: start empty (primary) or load sample data.
- Copy: EN/ID. Public footer mark is **Inovateks** only (no legal entity names).
- Required fields on submit forms: `FieldLabel` + `required` prop on field components; hint `requiredHint`.
- Seed vendors (merged into existing local data by name/id): Shop And Drive, Bengkel Bos, Mister Oli, B-Quik, Rotary Auto, Jaya Teknik AC, Shell, TODA, Montir Panggilan Mas Hasan.

## Stack (locked)

- One Expo SDK 57 TypeScript app: iOS, Android, **web**.
- React Navigation native-stack (not Expo Router).
- `app.json` → `web.output: "single"` for Cloudflare. Not Next.js, not a PWA rewrite.
- **Local working copy:** `src/data/repository.ts` → AsyncStorage / localStorage, key `servizio_v1_state`. One JSON object (`assets`, `vendors`, `logs`, `changes`, `events`, `language`, `homeColumns`). Fresh setup offers empty start or sample data.
- **PIN is local forever.** Never send PIN or PIN hash to the Worker.
- **Phase 1.1 cloud:** Cloudflare Worker + D1 (`prototype/api`). Email-first setup; existing emails always OTP (Resend). After verify, D1 blob is source of truth; local is offline cache. Full-blob sync with integer `revision`; 409 → user picks Use cloud / Keep mine.
- **Phase 1.2 photos:** R2 bucket `servizio-photos` (binding `PHOTOS`). On sync, local receipt/service-tag images upload via `PUT /media`, then log URIs become `r2:users/{userId}/logs/{logId}/…`. Display loads via authenticated `GET /media`. Never put photo bytes in the D1 JSON blob.
- **Deployed (prod test):** app `https://servizio.albertjohannes-id.workers.dev` → API `https://servizio-api.albertjohannes-id.workers.dev`. Build with `EXPO_PUBLIC_API_URL` set, then `npm run export:web` + `npx wrangler deploy` from `prototype/`. API: `cd api && npm run deploy`. Secret `RESEND_API_KEY` must be on Worker **`servizio-api`** (not the static `servizio` Worker).
- Client: `EXPO_PUBLIC_API_URL` (see `.env.example`). `src/data/apiClient.ts`, `cloudSync.ts`, `syncStorage.ts`. Sync UI: Account shows pending / last synced / offline / conflict; Home banners for conflict, offline-with-dirty, and errors. Auto-sync skips while a conflict is unresolved; expired sessions clear local cloud tokens.
- Old `serviceOverride: 'in_service'` migrates to `location: 'service_center'` in `normalizeAsset`.
- Missing `scheduleByDate` on loaded assets defaults to `true`. Missing `serviceKind` on logs defaults to `routine`.

## UI

- Warm paper `#F3F1EC`, ink `#1C1A17`. Minimal, not candy chips.
- Buttons: reusable `PrimaryButton`, slight corner radius.
- Home: colored square tiles (green / orange / red = schedule). Service Center shows a badge, not a fourth color. Tile image scales down for 3-per-row.
- Account → Appearance: 2 or 3 tiles per row (`homeColumns`).
- Thousand separators on quantities (km, cost); **not** on years.
- Suggest/search lists (brand, vendor, purchase-at) open **only while the field is focused**. Purchase-at presets: Shopee, Tokopedia, Blibli, Lazada, Official Dealer, Secondhand.
- Dates: compact in-app calendar (not full-screen). Years: dropdown.
- Kind picker: 3-across, transparent 3D icons. Name placeholder follows kind.
- Location picker: Home / Service Center with small house and workshop icons.
- PIN pad accepts hardware number keys on web.
- History: service and change cards; tap for a detail modal. Changes store **field + old + new + time**. Photos in modals use `TappablePhoto`. On a service log sheet you can **attach / change / remove** receipt and service-tag photos (marks sync dirty → R2 on next push).

## Layout

```
App.tsx                 shell: SafeArea → Auth → Assets → RootNavigator
src/data/               persistence, contexts, API client, cloud sync, photo sync, PIN
src/domain/             types, status math, number/date format
src/screens/            Setup (email → OTP if existing → PIN), Unlock, Home, Account, …
src/components/         … ScheduleModePicker, FieldLabel, TappablePhoto, …
src/i18n/strings.ts     EN + ID (keep keys in sync)
api/                    Cloudflare Worker: OTP, sessions, D1 sync blob, R2 media
docs/                   hosting + phase 1.1 / 1.2 notes
```

## Do not

- Add OCR, or put photos/base64 into the D1 JSON blob (use R2 + `r2:` keys).
- Send the PIN or PIN hash to the server.
- Fold location into condition, or override schedule color with “in service.”
- Rewrite as Next.js.
- Commit `.env`, secrets, `node_modules`, `.expo`, `.wrangler`, or `dist`.
- Put private company/legal names in the public UI or docs.
- Force-push `main` unless the user explicitly asks.

## Commands

```bash
npm install
npm run web
npx tsc --noEmit
# Public web (bake API URL into the bundle)
EXPO_PUBLIC_API_URL=https://servizio-api.albertjohannes-id.workers.dev npm run export:web
npx wrangler deploy
# API
cd api && npm install && npm run db:local && npm run dev
# API production
cd api && npm run deploy
```
