# Phase 1.2 — Receipt + service-tag photos on R2

**Status:** Implemented in `prototype/` (R2 + `PUT/GET /media` + client upload on sync).  
**Prior:** [phase-1.1-cloud-sync.md](./phase-1.1-cloud-sync.md)

## Goal

Sync **both** service-log photos (receipt and service tag) through Cloudflare R2 so a second device can load them after cloud sync. Photo **bytes** never go into the D1 JSON blob.

## Model

| Layer | What |
|-------|------|
| Local (pre-upload) | `file:` / `blob:` / content URIs on the device |
| After upload | `r2:users/{userId}/logs/{logId}/receipt.{ext}` and `…/service_tag.{ext}` |
| D1 `sync_state` blob | URI strings only (`r2:…` or `null`); local-only URIs stripped before PUT |
| R2 bucket | `servizio-photos`, Worker binding `PHOTOS` |

## API

- `PUT /media?kind=receipt|service_tag&logId=` — Bearer auth, body = image bytes, max 5MB
- `GET /media?key=` — Bearer auth; key must be under `users/{userId}/`
- `GET /health` → `{ photos: true }` when R2 is bound

## Client flow

1. **Log Service** can attach receipt and/or service tag when creating a log.
2. **Service history** detail sheet can attach / change / remove either photo later (`updateLogPhotos` → marks sync dirty).
3. On dirty sync: `uploadPendingPhotos` → rewrite URIs to `r2:` → `stripLocalPhotoUris` → `PUT /sync`.
4. `TappablePhoto` resolves `r2:` via `GET /media` → object URL (web) / display URI.

Replacing a photo uploads a new local URI; R2 overwrites the same key path for that log + kind.

## Out of scope

- OCR / auto-read of tags or receipts
- Deleting orphaned R2 objects when a photo is removed (keys left behind until cleanup)
- Public unauthenticated photo URLs
- Turnstile (separate)
- Full edit of other service-log fields (date, cost, notes, etc.)
