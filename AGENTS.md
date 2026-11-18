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
  - Untracked assets: detail shows "No reminders" (no separate Add schedule button); set reminders via the header **Edit** pencil, or let the first **routine log service** set them up inline ("Set up reminders from this visit").
- **Log service** — single manual form (no OCR):
  - Service date (required), **routine vs one-off** (`serviceKind`: `routine` | `one_time`).
  - Routine: updates next due date and/or next km depending on asset setup; one-off does not change schedule.
  - Next service date: date picker + **+1m…+6m** quick chips (`+1bln…` in ID) from service date. The six chips share one row (`flex: 1`, no wrap); keep labels short so they fit a 320px screen unclipped.
  - Optional notes, cost, **receipt** and **service tag** photos (tap for full screen), vendor.
- **Log km** — separate screen from Log service; updates `usageCurrent` only (change history). Available for **km-capable kinds** (car / motorcycle / bike) even if schedule is still **Not yet** (does not force `usageEnabled`).
- OTP email via **Resend** (`noreply@inovateks.id` in prod). Client shows **Resend code** with ~45s cooldown; codes expire in **10 minutes** (server-enforced).
  - The code is in the email subject (`Your Servizio code: 123456`) and in large type in the body. **Do not add a "Copy" button to the email**: email clients strip JavaScript, so it cannot copy to the clipboard.
  - Both code fields (Setup, Account verify) set `autoComplete="one-time-code"`, `textContentType="oneTimeCode"` and a numeric keyboard, so iOS/Android keyboards offer the code from the email/SMS in one tap.
- JSON backup/export on Account; **binary photos are not in the JSON** (export keeps `r2:` keys / local URIs as strings only). Archive is soft-hide; Account → Archived assets can restore or permanently delete.
- First run: start empty (primary) or load sample data.
- Setup: **Enter** submits the email field (Continue) and the verification-code field (Verify); same for the code field when verifying on Account. Both guard against double submit while busy.
- Existing verified email: after OTP + new local PIN, cloud data **loads automatically** (no "use cloud or start empty" choice). The Use cloud / Keep mine choice only appears on a real sync conflict in Account.
- **What's new**: `src/data/changelog.ts` lists every version in plain EN + ID bullets; shown in a modal (`WhatsNewModal`) once per version on Home, and anytime from Account → What's new. New installs are marked as seen at setup.
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
- **Production:** app `https://servizio.ai.id` → API `https://api.servizio.ai.id`. Build with `EXPO_PUBLIC_API_URL` set, then `npm run export:web` + `npx wrangler deploy` from `prototype/`. API: `cd api && npm run deploy`. Secret `RESEND_API_KEY` must be on Worker **`servizio-api`** (not the static `servizio` Worker).
- Client: `EXPO_PUBLIC_API_URL` (see `.env.example`). `src/data/apiClient.ts`, `cloudSync.ts`, `syncStorage.ts`. Sync UI: Account shows pending / last synced / offline / conflict; Home banners for conflict, offline-with-dirty, and errors. Auto-sync skips while a conflict is unresolved; expired sessions clear local cloud tokens.
  - **Every change syncs automatically** once the email is verified (a cloud session only exists after OTP verify; unverified accounts never sync): any state change (add, edit, log service/km, photos, archive…) triggers `syncNow` after a 900ms debounce, and the app also syncs when it returns to the foreground.
  - **Sync must never overwrite newer local data.** `runCloudSync` reads the latest stored state *after* the PUT, only patches photo keys onto it, and leaves `dirty: true` if anything changed while the request was in flight. A `pull` is skipped if the device became dirty during the download. A `syncNow` call that arrives while a sync is running sets `rerunRef` and one more sync runs right after (before this, a record saved mid-sync was silently lost). Do not write a pre-request snapshot back to storage or clear `dirty` blindly.
- Old `serviceOverride: 'in_service'` migrates to `location: 'service_center'` in `normalizeAsset`.
- Missing `scheduleByDate` on loaded assets defaults to `true`. Missing `serviceKind` on logs defaults to `routine`.

## Versioning and releases

- Semver. `package.json` `version` is the source; `src/version.ts` exports it as `APP_VERSION` (shown on Account and in the What's new modal). Keep `app.json` `expo.version` equal.
- Git tags are annotated and named `vX.Y.Z` (`v1.0.0`, `v1.1.0`, `v1.2.0`, …) on the commit that ships the version.
- Every user-visible release needs a **new top entry** in `src/data/changelog.ts` (`version`, `date`, `en[]`, `id[]`): short, plain sentences, no jargon.
- To release:
  1. Add the changelog entry; bump with `npm version X.Y.Z --no-git-tag-version`; set the same value in `app.json`.
  2. `npm run release:check` (fails if package.json, app.json and the newest changelog entry disagree, or an entry lacks EN or ID text).
  3. Commit, then `git tag -a vX.Y.Z -m "Servizio vX.Y.Z"` and `git push origin main --follow-tags`.
  4. Deploy the web build (see Commands). The API only needs a deploy when `api/` changed.

## UI

- Warm paper `#F3F1EC`, ink `#1C1A17`. Minimal, not candy chips.
- Buttons: reusable `PrimaryButton`, slight corner radius.
- Home: colored square tiles (green / orange / red = schedule). Service Center shows a badge, not a fourth color. With 3-per-row the picture size follows the tile (`AssetTile`: 18–48px, never colliding with the text; about 40px on a 390px phone).
- Account → Appearance: 2 or 3 tiles per row (`homeColumns`).
- **Home filter:** the four legend items (Overdue / Due soon / On track / No schedule) are multi-select checkboxes (`role="checkbox"`, `aria-checked`) and filter the tiles. All are selected by default. Tapping one while all are selected shows only that group; tapping others adds them; deselecting the last one returns to all; a "Show all" link appears while filtering and an empty selection shows "Nothing here right now". Grouping comes from `homeBucket()` in `domain/status.ts`, the same function that orders and colors the tiles. Filter state is per session (not persisted).
- Email verified is shown with a blue verified badge (`VerifiedBadge`, Instagram-style) before “Email verified” on Home and Account; unverified has no badge. Asset detail shows `-` for Reminders when nothing is tracked.
- **Log out** (Account, bottom row, danger color): wipes ALL local data on the device (assets, logs, photos, vendors, PIN, cloud session) via `resetDevice('logout')`. There is no server logout endpoint; the cloud copy is untouched. Before the confirm, a verified account runs a sync first; the confirm text always says all local data is deleted, then adds one of: data safe in cloud (sign in again with the email), recent changes NOT synced and will be lost (`sync_meta.dirty` still true), or email not verified so nothing is in the cloud (export a backup first). Cancel changes nothing.
- Thousand separators on quantities (km, cost); **not** on years.
- Suggest/search lists (brand, vendor, purchase-at) open **only while the field is focused**. Purchase-at presets: Shopee, Tokopedia, Blibli, Lazada, Official Dealer, Secondhand.
- Dates: compact in-app calendar (not full-screen). Years: dropdown.
- Kind picker: 3-across, transparent 3D icons. Name placeholder follows kind.
- Asset detail shows condition and location in a compact row; Edit with a pencil icon is in the header. Reminders show the next due text (or "No reminders"). Log service and Log km stay in a bottom action bar.
- Add/Edit Asset groups details, condition/location, and reminders; the standard back arrow discards unsaved edits, Save is in a fixed bottom bar, and Archive asset is separated at the end of the form with confirmation.
- Add/Edit Asset: condition and reminders use dropdowns. Location picker: Home / Service Center with small house and workshop icons.
- Edit Asset can open scrolled to the reminders section via `focusSection: 'reminders'`; no screen uses it right now (the detail-page Add schedule button was removed in 1.2.2).
- Service records on the asset detail page are sorted by service date, newest first (`logsFor` in `AssetContext`; ties: most recently saved first).
- PIN pad accepts hardware number keys on web.
- **Navigation after save:** React Navigation 7 `navigate()` to a screen already in the stack pushes a duplicate (back then reopens the form). To return, use `navigation.popTo('Screen', params)`. Saving a service record, km, or asset edit pops back to the existing Asset detail with `savedAt: Date.now()` (shows the "Saved" toast); archive / restore / delete pop to Home / Archived. A new asset uses `replace('AssetDetail')`.
- Avoid `CI=1` for a long-running `expo start` while editing: it disables file watching and serves stale bundles.
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
npm run release:check
# Public web (bake API URL into the bundle)
EXPO_PUBLIC_API_URL=https://api.servizio.ai.id npm run export:web
npx wrangler deploy
# API
cd api && npm install && npm run db:local && npm run dev
# API production
cd api && npm run deploy
```

- Home: four schedule legend filters stay in one row; profile shows email verification status and links to Account for verification. Condition dropdown uses the same green/amber/red dots as tiles.
- Hashed web assets use immutable caching via `public/_headers`; keep HTML revalidated so deployments load the latest bundle.
