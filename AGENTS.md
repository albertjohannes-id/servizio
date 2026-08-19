# Servizio — agent notes

This file is the source of truth for **any** coding agent (Claude Code, Cursor, Copilot, Gemini, Codex, Aider, etc.). Tool-specific stubs (`CLAUDE.md`, `.github/copilot-instructions.md`) only point here.

## Product

Servizio is a **personal Asset Command Center** (not a shop marketplace, not a spend tracker first). People forget service dates; calendar is the current workaround.

- Users: multi-asset personal owners (renters included). Not B2B fleets.
- Dual status: **Condition** (Working / Needs Attention / Not Working — manual only) + **Service** (On Schedule / Due Soon / Overdue / In Service).
- Due Soon: 14 days or ~10% of km interval left.
- Service tag (stiker servis): photo of the workshop sticker; user copies dates. **No OCR.**
- Auth: **local only**. One profile per device — email + 6-digit PIN (PBKDF2 hash + salt in `servizio_v1_auth`). Unlock session `servizio_v1_unlock` expires after 1 hour idle. Logout = lock (PIN again). After 10 wrong PINs, user may reset device (wipes local data). JSON backup/export on Account screen; photos not included in backup.
- Copy: EN/ID. Public footer mark is **Inovateks** only (no legal entity names).
- Seed shops: Shop And Drive, Bengkel Bos, Mister Oli, B-Quik, Rotary Auto.

## Stack (locked)

- One Expo SDK 57 TypeScript app: iOS, Android, **web**.
- React Navigation native-stack (not Expo Router).
- `app.json` → `web.output: "single"` for Cloudflare Pages. Not Next.js, not a PWA rewrite.
- MVP data: **no remote DB**. `src/data/repository.ts` → AsyncStorage / localStorage, key `servizio_v1_state`. One JSON object (`assets`, `vendors`, `logs`, `changes`, `events`). Do not split into multiple storage keys unless asked.
- Supabase sync = later; swap the repository module only.

## UI

- Warm paper `#F3F1EC`, ink `#1C1A17`. Minimal, not candy chips.
- Thousand separators on quantities (km, cost); **not** on years.
- Suggest/search lists (brand, vendor) open **only while the field is focused**.
- Dates: in-app calendar. Years: dropdown.
- Kind picker: 3-across, transparent 3D icons.

## Layout

```
App.tsx                 shell: SafeArea → Auth → Assets → RootNavigator
src/data/               persistence, contexts, image pick, notifications
src/domain/             types, status math, number/date format
src/screens/            Setup, Unlock, Home, Account, AddEditAsset, AssetDetail, LogService, Debug
src/components/         shared UI
src/i18n/strings.ts     EN + ID (keep keys in sync)
```

## Do not

- Add OCR, real auth, or a remote database in MVP.
- Rewrite as Next.js.
- Commit `.env`, secrets, `node_modules`, `.expo`, or `dist`.
- Put private company/legal names in the public UI or docs.

## Commands

```bash
npm install
npm run web
npx tsc --noEmit
npm run export:web
```
