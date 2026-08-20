# Data storage — local cache + cloud truth

## Phase 1.1 (in `prototype/`)

See **[phase-1.1-cloud-sync.md](./phase-1.1-cloud-sync.md)** and **[phase-1.2-photo-r2.md](./phase-1.2-photo-r2.md)**.

**Cloud is source of truth** (D1 sync blob) once the user verifies email (OTP).  
**Local is a working copy** so web and future native apps work **offline**; when online, dirty local state pushes up. Revision conflicts ask Use cloud / Keep mine.

| Piece | Where |
|-------|--------|
| Assets / logs / vendors / etc. | D1 blob + local cache (`servizio_v1_state`) |
| PIN | Local only (`servizio_v1_auth`) — never sent |
| OTP | Resend → email; challenge in D1 (`devOtp` locally without Resend) |
| Sessions | D1 + `servizio_v1_cloud_session` |
| Photos | **R2** (`servizio-photos`) via `PUT/GET /media`; blob stores `r2:` keys |

JSON export/import keeps URI strings only (no binary). Unverified or offline use stays local until the next successful sync.

Clearing browser / uninstall **wipes this device**; a verified email can restore the cloud blob on a new device after OTP + new PIN.
