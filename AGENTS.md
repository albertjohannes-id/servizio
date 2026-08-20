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
- **Schedule tracking per asset:**
  - `scheduleByDate` (default true) — time-based next service date.
  - `usageEnabled` — km-based interval + next km due.
  - Car / motorcycle / bike can enable **both** toggles on Add/Edit asset.
- **Log service** — single manual form (no service-tag path, no OCR):
  - Service date (required), **routine vs one-off** (`serviceKind`: `routine` | `one_time`).
  - Routine: updates next due date and/or next km depending on asset setup; one-off does not change schedule.
  - Next service date: date picker + **+1…+6 month** quick chips from service date.
  - Optional notes, cost, receipt photo (tap for full screen), vendor.
- **Log km** — separate screen from Log service; updates `usageCurrent` only (recorded in change history). For assets with `usageEnabled`.
- Home tiles show understandable maintenance copy via `maintenanceTileDisplay()` in `domain/status.ts`:
  - Full: `Service in {n} days`, `Service in {n} km`, overdue variants.
  - Compact grid + both trackers: `In {days} · {km}` on one line.
- Auth: **local only**. One profile per device — email + 6-digit PIN (PBKDF2 hash + salt in `servizio_v1_auth`). Unlock session `servizio_v1_unlock` expires after 1 hour idle. Logout = lock (PIN again). After 10 wrong PINs, user may reset device (wipes local data). JSON backup/export on Account; photos are not included. Archive is soft-hide; Account → Archived assets can restore or permanently delete.
- First run: start empty (primary) or load sample data.
- Copy: EN/ID. Public footer mark is **Inovateks** only (no legal entity names).
- Required fields on submit forms: `FieldLabel` + `required` prop on field components; hint `requiredHint`.
- Seed vendors (merged into existing local data by name/id): Shop And Drive, Bengkel Bos, Mister Oli, B-Quik, Rotary Auto, Jaya Teknik AC, Shell, TODA, Montir Panggilan Mas Hasan.

## Stack (locked)

- One Expo SDK 57 TypeScript app: iOS, Android, **web**.
- React Navigation native-stack (not Expo Router).
- `app.json` → `web.output: "single"` for Cloudflare. Not Next.js, not a PWA rewrite.
- MVP data: **no remote DB**. `src/data/repository.ts` → AsyncStorage / localStorage, key `servizio_v1_state`. One JSON object (`assets`, `vendors`, `logs`, `changes`, `events`, `language`, `homeColumns`). Fresh setup offers empty start or sample data. Do not split into multiple storage keys unless asked.
- Old `serviceOverride: 'in_service'` migrates to `location: 'service_center'` in `normalizeAsset`.
- Missing `scheduleByDate` on loaded assets defaults to `true`. Missing `serviceKind` on logs defaults to `routine`.
- Cloud sync = phase 1.1 — case doc `10_phase_1.1_cloud_sync.md` (Cloudflare Worker + D1 + email OTP). Swap `repository.ts` only.

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
- History: service and change cards; tap for a detail modal. Changes store **field + old + new + time**. Photos in modals use `TappablePhoto`.

## Layout

```
App.tsx                 shell: SafeArea → Auth → Assets → RootNavigator
src/data/               persistence, contexts, image pick, notifications, PIN
src/domain/             types, status math, number/date format
src/screens/            Setup, Unlock, Home, Account, AddEditAsset, AssetDetail,
                        LogService, LogKm, ArchivedAssets, Debug
src/components/         shared UI (PrimaryButton, AssetTile, FieldLabel, TappablePhoto,
                        ServiceKindPicker, MonthQuickPick, LocationPicker, PinPad, …)
src/i18n/strings.ts     EN + ID (keep keys in sync)
```

## Do not

- Add OCR, real cloud auth, or a remote database in MVP.
- Fold location into condition, or override schedule color with “in service.”
- Rewrite as Next.js.
- Commit `.env`, secrets, `node_modules`, `.expo`, or `dist`.
- Put private company/legal names in the public UI or docs.
- Force-push `main` unless the user explicitly asks.

## Commands

```bash
npm install
npm run web
npx tsc --noEmit
npm run export:web
```
