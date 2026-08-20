# Decision Log

This document records important product decisions made during Product Discovery.

Its purpose is to capture the reasoning behind each decision so future discussions have context.

---

## Decisions

### Working Notes

| Decision | Why | Trade-off | Status |
|----------|-----|-----------|--------|
| Dual status: Condition (3) + Service (4) | Separates “how it works now” from “schedule position” | Slightly more UI than one status | Approved |
| MVP: optional cost + receipt photo; OCR later | History value without OCR complexity | No auto amount extract in v1 | Approved |
| Vendors = editable seed list, not marketplace | Supports “who I used” without marketplace scope | No discovery/booking network effects | Approved |
| Offline-first + EN/ID + consumer launch | Founder constraints | Higher build cost than online-only / single language | Approved |
| Solution = **Option B Asset Command Center** | Best fit to forgetting pain + confirmed scope | Medium eng complexity vs thin reminder app | Approved |
| Rejected A (reminder-only) | Too similar to calendar; weak differentiation/retention | Ships faster | Rejected |
| Rejected C (spend/history-first) | Secondary to forgetting | Stronger money insight earlier | Rejected |
| Rejected D (vendor marketplace) | Wrong primary pain; high complexity / cold start | Possible later growth vector | Rejected |
| Due Soon = **14 days** or **~10%** usage interval left | Simple default for MVP | May tune per asset type later | Approved (provisional) |
| Interval defaults by asset type, always editable | Faster setup without locking users in | Defaults may be wrong for some assets | Approved (provisional) |
| Local-first data; account/sync **phase 1.1** | Unblocks offline consumer use; clarifies “sync when online” | No multi-device backup in MVP | Approved |
| Local OS notifications for Due Soon / Overdue | Reminders must work without server push | No cross-device push yet | Approved |
| Condition status = **manual only** in MVP | Keeps rules simple; avoids wrong auto status | User must update when something breaks | Approved |
| North Star = **on-time service rate** (Overdue % proxy early) | Aligns metrics to forgetting / missed service outcome | Targets TBD until baseline | Approved |
| Implemented Expo MVP prototype (local-first) | Explicit “all of it” / Implement MVP | No OCR/sync/marketplace in build | Approved |
| Log service **from service tag photo** (no OCR) | ID workshops issue stiker servis with done + next dates; photo is the source of truth users already have | User still types dates; OCR pre-fill later | Approved |
| **Expo for iOS + Android + web**; host web on **Cloudflare Pages** | One codebase; web required; native is long-term better for camera/reminders; Pages fits local-first static export | Web notifications/camera weaker than native; not a Next.js PWA | Approved |
| Expo web static export **verified** (`npx expo export --platform web` → `dist/`) | Confirms Pages can host the SPA | Live Pages project not created yet | Approved |
| **MVP = no remote DB** (local AsyncStorage / localStorage only) | Unblocks offline + web host without backend | Device wipe / browser clear loses data | Approved |
| **Mock login** (email gate, no password/server) | End-to-end path without accounts yet | Not real auth | Approved |
| **Supabase sync = phase 1.1** | Founder intent; keep schema PG-compatible | Not in this build | Superseded → see below |
| **Phase 1.1 = Cloudflare Worker + D1 + email OTP** | Same host as web; TypeScript API; no second app; D1 for users/sessions/sync blob | Email provider cost; more custom auth than Supabase Auth | Approved (2026-08-20) |
| **OTP via Resend** (not Zoho Mail SMTP) | Workers need HTTP; Resend is transactional; Zoho Mail stays human inbox | Extra vendor; free tier 100/day | Approved (2026-08-20) |
| **Cloud-authoritative + local offline cache** | No public users yet — revamp data location; native offline later | Need sync + conflict UX | Approved (2026-08-20) |
| **Email-first setup** (check exists → OTP if yes, else PIN + register unverified) | Cleaner than verify-later-only; existing email always OTP | Offline setup needs Continue offline | Approved (2026-08-20) |
| **Sync = full blob + revision; user decides conflicts** | Simple for 1.1; dirty push when online | No field-level merge until 1.2+ | Approved (2026-08-20) |
| **Receipt photos: local-only in MVP JSON backup** | Copy already says photos not included; schedule/history is the portable part | Photos lost on wipe until R2 | Approved (2026-08-20) |
| **Cloud photos = R2, not D1 base64** | D1 ~1 MB query cap; R2 free 10 GB + free egress | Extra binding; 1.2 not 1.1 | Approved (2026-08-20) |
| **Receipt + service-tag both on R2** (`PUT/GET /media`) | Both log photos must follow the device after sync | Auth + size limits; no public URLs | Approved (2026-08-20) |
| **History sheet can attach/change/remove photos** | Test R2 without new logs; fix forgotten/blurry attaches | No full edit of other log fields | Approved (2026-08-20) |
| Rejected Next.js PWA rewrite for MVP | Web felt “easier” but rebuild cost is high vs extending Expo | Share-a-link is still possible via Expo web on Pages | Rejected |
| **Log service = manual form** (receipt + optional service-tag photo; no OCR) | Tag photo is evidence users already take; OCR deferred | User still types dates | Superseded (2026-08-20): tag attach restored with R2 |
| **Routine vs one-off** service logs | Routine updates schedule; one-off is repair/check without changing next due | Extra choice on log form | Approved (2026-08-20) |
| **Log km** separate from log service | Odometer updates without a full service record; keeps home dashboard accurate | Two actions on asset detail | Approved (2026-08-20) |
| **Dual schedule toggles** (date + km) for vehicles | Cars/motorcycles often need both time and distance reminders | Slightly more setup on add asset | Approved (2026-08-20) |
| Home maintenance copy: **“Service in X days/km”** | Clearer than raw dates or bare numbers on tiles | Longer strings; compact grid merges with ` · ` | Approved (2026-08-20) |
| **Schedule mode picker** replaces dual toggles | One explicit choice: date / km / both / not yet | Extra screen space on add asset | Approved (2026-08-20) |
| **New assets default to Not yet** | Register first without knowing next service | User must opt in to reminders | Approved (2026-08-20) |
| **Routine log can enable schedule** on untracked assets | First workshop visit sets up reminders inline | More fields on log form when untracked | Approved (2026-08-20) |

---

## Alternatives Considered

### Option A — Reminder-first calendar replacement

Pros: Fastest ship  
Cons: Weak vs calendar; limited retention

### Option B — Asset command center *(chosen)*

Pros: Matches core pain + dual status + log/history + vendors seed  
Cons: Medium scope discipline required

### Option C — Spend & history first

Pros: Cost/receipt value  
Cons: Under-solves forgetting

### Option D — Vendor marketplace

Pros: Long-term marketplace potential  
Cons: Wrong v1 problem; high risk

### Final Decision

**Option B — Servizio Asset Command Center MVP.** Reason: prevents forgotten maintenance while adding just enough status, logging, and vendor memory to beat calendar—without marketplace or OCR.

---

## STEP 6 — Documentation Review (2026-08-03)

### Consistency check

- Problem → Goals → Users → MVP → Metrics align on **forgotten maintenance**, **Option B**, dual status, offline/local-first, EN/ID, cost + receipt photo, vendor seed.
- PRD acceptance criteria match MVP include/exclude.
- Metrics North Star matches user goal “don’t miss service”; guardrails protect simplicity and optional cost/receipt.
- No conflicting decisions across `01`–`06`.
- Assumptions remain **Pending** market validation (expected; provisional accept for build planning).

### Nuance resolved (was mild inconsistency)

- Early notes said “offline-first with sync when online.”  
- **MVP (shipped):** local-only offline.  
- **Phase 1.1 (implemented in `prototype/`):** **cloud-authoritative** after email OTP; **local = cache** for offline; PIN never leaves the device. See [10_phase_1.1_cloud_sync.md](./phase-1.1-cloud-sync.md).

### Gaps (not blockers for product-doc close; needed before / during impl)

- Exact suggested service intervals per asset type (content table)
- Analytics SDK / event schema confirmation
- Notification copy + cadence (how often Due Soon repeats)
- Receipt photo storage limits on device
- Soft-launch cohort plan to set metric baselines
- Monetization model
- GTM: Indonesia-first vs broader EN/ID

### Risks to carry forward

- Dual status may feel complex → validate in usability (EN + ID labels)
- Users may not update km → km schedules drift → mitigate with prompts, keep time-based always available
- Local-only = device loss loses data → communicate; prioritize sync in 1.1 if retention suffers
- Notification fatigue / permission denial → weakens core reminder loop (guardrail)
- Without interviews, “forgetting is #1” stays High-confidence assumption, not proven
- Consumer launch without monetization decision = unclear sustainability (business risk, not MVP blocker)

---

## Outstanding Decisions

- Exact suggested intervals per asset type (content)
- Monetization model (free / freemium / paid)
- Indonesia-first go-to-market emphasis vs broader EN/ID
- Notification repeat cadence / copy
- Cloud sync / account implementation detail → [10_phase_1.1_cloud_sync.md](./phase-1.1-cloud-sync.md)

---

## Ready to Continue Checklist

- [x] Major product decisions are documented
- [x] Key trade-offs are recorded
- [x] Outstanding decisions are identified
- [x] STEP 6 consistency review completed
- [x] Founder confirmation on product docs (via continue)
