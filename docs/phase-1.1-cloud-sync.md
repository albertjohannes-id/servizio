# Phase 1.1 — Cloud-authoritative data + offline local cache

**Status:** Implemented in `prototype/` (Worker + D1 + client setup/sync). Photos → **[phase 1.2 R2](./phase-1.2-photo-r2.md)**.  
**Parent:** [04_prd.md](../README.md)  
**Baseline today:** Cloud-authoritative D1 blob after OTP; local AsyncStorage working copy + local PIN.

This document is the **approved direction**. Update it when decisions change.

---

## Goal

**Cloud is the source of truth** for asset data (after the user is linked).  
**Local storage is a working copy** so the app (especially future native) works **offline**; when the device is online again, it syncs up.

- App must open and edit **without network**.
- Online → pull if cloud ahead, push if local dirty.
- **PIN stays local forever** — unlocks the app on *this* device; never the cloud password.
- Email OTP (**Resend**) proves mailbox ownership and links the device to a cloud user.
- Photo **bytes** live on **R2** (1.2); the sync blob stores `r2:` keys only.

No public users yet → we can revamp setup + repository around this model without migration pain.

---

## Mental model

```
┌──────────────────────────────────────────────┐
│  Device (web / future iOS / Android)          │
│  - PIN hash (local only)                      │
│  - Local cache = copy of cloud blob           │
│  - dirty + lastSyncedRevision                 │
│  - Reads/writes ALWAYS go to local first      │
└────────────────────┬─────────────────────────┘
                     │ when online
                     ▼
┌──────────────────────────────────────────────┐
│  Cloudflare Worker + D1                       │
│  - users / devices / OTP / sessions           │
│  - sync_state blob (authoritative)            │
│  - Resend → OTP email                         │
└──────────────────────────────────────────────┘
```

| Role | Store |
|------|--------|
| Source of truth (linked user) | D1 `sync_state` |
| Offline / fast UI | AsyncStorage / localStorage cache |
| Device lock | Local PIN (`servizio_v1_auth`) |
| Cloud auth | Session tokens after OTP |
| Receipts (later) | R2 object keys in blob |

Unverified / offline-only new install: local is temporary truth until first successful verify + sync; then cloud becomes authoritative.

---

## Architecture

```
┌─────────────────────────────────────┐
│  Expo app (iOS / Android / web)      │
│  - Local PIN                         │
│  - Local cache (servizio_v1_state)   │
│  - Sync metadata (revision, dirty)   │
│  - repository.ts → local + API       │
└──────────────┬──────────────────────┘
               │ HTTPS when online
               ▼
┌─────────────────────────────────────┐
│  Cloudflare Worker (TypeScript)      │
│  POST /auth/check-email              │
│  POST /auth/register                 │
│  POST /auth/request-otp              │
│  POST /auth/verify-otp               │
│  POST /auth/refresh                  │
│  GET  /sync                          │
│  PUT  /sync                          │
└──────────────┬──────────────────────┘
               │
       ┌───────┼────────┬──────────────┐
       ▼       ▼        ▼              ▼
     D1      KV       Resend         R2 (1.2+)
   users,    rate     OTP mail       photos
   sessions  limits
   sync blob
```

**Web host:** Existing static Expo export. API on same Worker routes or `api.*`.

---

## Setup journeys (email-first)

### A — New email (not in D1)

1. User enters email → `POST /auth/check-email` → `{ exists: false }`
2. Create **PIN** locally
3. `POST /auth/register` → create `users` (`emailVerified: false`) + `devices`
4. Enter Home — full local use; Account shows **Unverified**
5. Optional later: **Verify email** (OTP) → enables cloud sync / makes cloud authoritative

If check-email fails (offline): allow **Continue offline** (local-only until network) or Retry.

### B — Existing email (verified or not)

1. User enters email → `{ exists: true }`
2. **Always OTP** (Resend) — proves ownership before linking this device
3. After OTP success → create **new local PIN** on this device (PIN is per-device)
4. Link device + issue session; set `emailVerified: true`
5. If cloud has blob and local empty → confirm restore from cloud (default: offer restore)
6. If both have data → **user chooses**: Use cloud / Keep mine / Export & cancel

Wording: new path ≈ “Create account”; existing ≈ “Sign in” — same setup, two branches.

---

## PIN vs cloud session

| | Where | Purpose |
|---|---|---|
| PIN | Local only (`pinSalt` + `pinHash`) | Unlock app on this device |
| Cloud session | D1 + local tokens | Authorize GET/PUT `/sync` |

Server never sees or stores PIN. Wrong PIN does not affect cloud.

---

## Sync model (1.1 — full blob + revision)

Same JSON shape as today: `assets`, `logs`, `changes`, `vendors`, `events`, `language`, `homeColumns`.

### Server (`sync_state`)

| Column | Notes |
|--------|--------|
| `user_id` | PK |
| `blob_json` | Full AppState JSON |
| `revision` | Integer, increments on each accepted PUT |
| `updated_at` | ISO timestamp |
| `updated_by_device_id` | Optional audit |

### Client sync metadata (not inside the asset blob)

| Field | Notes |
|-------|--------|
| `deviceId` | UUID, stable per install |
| `lastSyncedRevision` | Last cloud revision successfully applied/pushed |
| `dirty` | True after any local write since last successful push |
| `cloudLinked` / session tokens | After OTP |

### Behavior

1. **Every edit** → write local immediately → set `dirty = true`
2. **When online** (app open, resume, debounce after save):
   - If `dirty` → `PUT /sync` with `{ baseRevision: lastSyncedRevision, blob }`
   - Else → optional `GET /sync`; if server revision > local → pull (or conflict if dirty too)
3. **PUT success** → `revision = newRevision`, `dirty = false`
4. **PUT 409** (revision mismatch) → conflict UI: **Use cloud** / **Keep mine**

No row-level delta merge in 1.1. “Sync only new data” = **only push when dirty**, not field-level merge. Row-level sync = **1.2+** if multi-device conflicts hurt.

### Conflict UX

- Prefer **user decides** (no silent last-write-wins for diverged blobs).
- Common case: local dirty, cloud unchanged → auto push.
- Fresh device, cloud has data → offer restore with confirm.

---

## API sketch

| Endpoint | Purpose |
|----------|---------|
| `POST /auth/check-email` | `{ email }` → `{ exists, emailVerified? }` |
| `POST /auth/register` | New user + device after local PIN created |
| `POST /auth/request-otp` | Send 6-digit code (Resend); store hash in D1 |
| `POST /auth/verify-otp` | Verify → session tokens; mark verified |
| `POST /auth/refresh` | Rotate tokens |
| `GET /sync` | Auth required → `{ revision, updatedAt, blob }` |
| `PUT /sync` | Auth required → `{ baseRevision, blob }` → new revision or 409 |

Rate-limit OTP per email/IP (KV or D1).

---

## D1 schema (minimal)

- `users` — id, email (unique), email_verified, verified_at, created_at  
- `devices` — id, user_id, device_id, created_at, last_seen_at  
- `otp_challenges` — id, email, code_hash, expires_at, used_at, attempt_count  
- `sessions` — id, user_id, device_id, access_hash, refresh_hash, expires…  
- `sync_state` — user_id, blob_json, revision, updated_at, updated_by_device_id  

---

## Storage products

| Product | Use |
|---------|-----|
| **D1** | Users, OTP, sessions, sync JSON blob |
| **KV** | Optional OTP / IP rate limits |
| **Resend** | OTP transactional email (HTTP from Worker) — free ~3k/mo, 100/day |
| **R2** | Receipt + service-tag photos — **done in 1.2** (never base64 in D1) |
| **Zoho Mail** | Human/support inbox only — **not** for app OTP SMTP |

Do **not** put photos in D1 (≈1 MB statement limit). Do **not** use Zoho Mail SMTP from Workers.

---

## Photos & JSON export

- Export keeps URI strings only (`r2:` / local); binary bytes are not embedded.
- 1.1 sync stored blob without embedding photo bytes; local URIs broke on other devices.
- **1.2 (shipped):** upload to R2; blob stores `r2:` keys; see [10_phase_1.2_photo_r2.md](./phase-1.2-photo-r2.md).

---

## Client changes

1. **Setup** — email-first check; branch new vs existing (OTP); then PIN.  
2. **Account** — Verified / Unverified; Verify email; sync status (last synced, dirty).  
3. **`repository.ts`** — always local read/write; sync layer when linked + online.  
4. Keep **Export JSON** as emergency escape hatch.

---

## Security checklist

- OTP: hash, expiry (~10 min), single use, attempt limits, rate limit  
- Sessions: hashed refresh, rotation  
- CORS: allow known web origin(s)  
- Secrets only in Worker (Resend API key)  
- PIN never leaves device  
- TLS only  

---

## Out of scope for 1.1

- Row-level / CRDT merge  
- R2 photos → **shipped in [1.2](./phase-1.2-photo-r2.md)**  
- OCR, household, marketplace  
- Replacing PIN with cloud password  
- Server push notifications  

---

## Implementation order

1. Worker + D1 schema + Wrangler  
2. `check-email` + `register`  
3. OTP request/verify + **Resend**  
4. Sessions + refresh  
5. GET/PUT sync (revision)  
6. Client setup revamp + Account verify status  
7. Online sync loop (dirty push / pull) + conflict UI  
8. Deploy + monitoring  

---

## Doc map

| Doc | Role |
|-----|------|
| [04_prd.md](../README.md) | Product scope |
| **This file** | Engineering plan for cloud + offline cache |
| [06_decision_log.md](./06_decision_log.md) | Decisions |
| [notes/mvp-local-storage.md](./notes/mvp-local-storage.md) | Storage notes |
| [prototype/AGENTS.md](./prototype/AGENTS.md) | Agent rules |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-20 | Initial: Worker + D1 + OTP blob sync; superseded Supabase notes |
| 2026-08-20 | Zoho/R2 notes; then Resend preferred for OTP |
| 2026-08-20 | **Revamp:** cloud-authoritative after link; local = offline cache; email-first setup; blob + revision; user conflict UI; Resend OTP |
