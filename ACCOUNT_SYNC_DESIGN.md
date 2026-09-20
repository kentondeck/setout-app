# Account + Cloud Sync — Design Spec

Status: **design only, not built.** This is the spec for adding accounts and
cross-device sync of the user's business records (receipts, tool inventory,
job/site photos). Nothing here ships until the org Apple Developer account is
enrolled and a backend project exists — see [SUBSCRIPTION_SETUP.md](SUBSCRIPTION_SETUP.md)
for the account/subscription groundwork this builds on.

---

## 1. Goal

> A Pro subscriber signs in on any device and their receipts, tool list, and
> site photos are just there — phone, new phone, tablet, web.

Today every byte lives on-device (localStorage + Capacitor Filesystem) with a
manual backup file ([backup.ts](src/lib/backup.ts)) as the only way to move it.
That's fine for a free calculator, but receipts are **tax records** and tool
lists back **insurance claims** — losing them to a dropped phone is exactly the
failure this removes.

## 2. The model: **sync is a Pro feature**

| Tier | Data |
|------|------|
| **Free** | Local only — current behaviour (1 calc/day, manual backup file). No account. |
| **Pro** | Account + receipts / tools / job photos synced to every device. |

This is deliberate:
- Gives tradies a concrete reason to pay — *"your records, safe, on every device."*
- Only paying users cost storage, so free users never touch the backend.
- The account exists to power **data sync** (and cross-platform Pro entitlement).
  It is **not** the same as their Apple ID — Apple handles payment; our account
  is a separate identity layer linked to the RevenueCat entitlement.

## 3. Provider

**Recommended: Firebase (Firestore + Cloud Storage + Auth).**

The deciding factor is **offline-first**. A tradie photographs a receipt in a
basement with no signal; it must save locally and sync later without them
thinking about it. Firestore's offline persistence does this natively with the
least custom sync code.

| | Firebase *(recommended)* | Supabase | Notes |
|---|---|---|---|
| Offline sync | ✅ built-in | ⚠️ DIY cache layer | The tradie-on-site case |
| Auth (Sign in with Apple) | ✅ | ✅ | |
| Object storage | Cloud Storage | Storage | Both fine for photos |
| Model | NoSQL docs | Postgres + RLS | Supabase if you want SQL |
| Egress on photos | ~$0.12/GB | ~$0.09/GB over tier | See §11 — cache locally to keep this ~one-time/device |

If photo egress ever dominates, move **just the photo bytes** to **Cloudflare
R2** (zero egress fees) and keep Firestore for metadata + auth. Not needed at
launch.

The rest of this doc assumes Firebase. Supabase equivalents are noted where they
differ materially.

## 4. Data model

Split: **queryable metadata → Firestore, photo bytes → Cloud Storage.** Big
binaries never go in the DB. Everything is namespaced by `uid` and locked to the
owner by security rules.

Grounded in the current types in [useRecords.ts](src/lib/useRecords.ts) and
[useJobPhotos.ts](src/lib/useJobPhotos.ts):

### Firestore

```
users/{uid}
  { displayName, region, createdAt }

users/{uid}/receipts/{receiptId}
  { timestamp, supplier?, amount?, date?, category?, jobId?, notes?,
    photoPath, updatedAt, deleted }              // Receipt (useRecords.ts:18)

users/{uid}/tools/{toolId}
  { timestamp, name?, brand?, model?, serial?, purchaseDate?,
    replacementValue?, category?, notes?,
    photoPath, updatedAt, deleted }              // Tool (useRecords.ts:30)

users/{uid}/jobs/{jobId}
  { ...existing job fields, updatedAt, deleted }

users/{uid}/jobPhotos/{photoId}
  { jobId, timestamp, comment?, photoPath, updatedAt, deleted }  // PhotoRecord (useJobPhotos.ts:31)
```

Two fields added to every synced record beyond today's shape:
- **`updatedAt`** — for last-write-wins conflict resolution (§6).
- **`deleted`** — soft-delete tombstone so a delete on one device propagates and
  a stale offline copy can't resurrect it.

`photoPath` replaces today's local `filename` with the Storage path.

### Cloud Storage

```
users/{uid}/receipts/{receiptId}.jpg
users/{uid}/tools/{toolId}.jpg
users/{uid}/jobphotos/{jobId}/{photoId}.jpg
```

Photos are already compressed to ≤1600px / JPEG q0.72 before storage
([useRecords.ts:123](src/lib/useRecords.ts#L123)) — ~150–400KB each — so they
upload as-is.

### Security rules (Firestore + Storage)

```
match /users/{uid}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Supabase equivalent: Row-Level Security policy `auth.uid() = user_id` on every
table + storage bucket policy.

## 5. Auth + the subscribe flow

**Sign in with Apple** is the primary method (one tap, Face ID, no passwords).
Add **email** as a second option so Android/web users aren't locked out. Per
Apple Guideline 4.8, *if* any third-party social login is added later, Sign in
with Apple must also be offered — offering it from day one avoids that trap.

**Critical ordering — sign in *before* the purchase completes:**

1. User hits the paywall, taps subscribe
2. **Sign in with Apple** → we get a stable `uid`
3. `RevenueCat.logIn(uid)` — binds the entitlement to the account
4. *Then* present Apple's purchase sheet

Buying anonymously first and creating the account afterward forces RevenueCat to
*alias* the anonymous purchase onto the account later — the classic source of
*"I paid but my new phone says free"* tickets. Log in → then buy avoids it.

Wire-up points: `Purchases.logIn` / `Purchases.logOut` go in
[SubscriptionContext.tsx](src/lib/SubscriptionContext.tsx) alongside the existing
`configure`; entitlement id stays `pro` ([subscription.ts](src/lib/subscription.ts)).

## 6. Sync layer

**Design: local-first, Firestore offline persistence as the metadata cache,
Storage + Filesystem for photos.**

- **Metadata** — point [useRecords.ts](src/lib/useRecords.ts) and
  [useJobPhotos.ts](src/lib/useJobPhotos.ts) at Firestore with offline
  persistence enabled. Firestore *is* the local cache: reads/writes hit the
  local copy instantly and sync in the background. For a free (no-account) user,
  these hooks keep their current localStorage path — the store is chosen at
  runtime by auth state.
- **Photos** — on add: write to Filesystem (instant local display, today's
  behaviour) **and** upload to Cloud Storage. On sync to a new device: download
  from Storage → cache to Filesystem on first view, then serve locally. This
  keeps egress to ~one-time-per-device (see §11).

### Conflict resolution

Records are append-heavy with occasional edits — not collaborative documents —
so **per-record last-write-wins on `updatedAt`** is sufficient. No field-level
merging needed. Deletes are tombstones (`deleted: true`), never hard removes
until a retention job cleans them, so an offline device can't resurrect a
deleted receipt. This is *record-level* sync, which is why we don't use the
whole-file backup blob for ongoing sync (that would clobber on two devices).

## 7. One-time migration (local → account)

The moment a user first signs in, their existing on-device records must go up:

1. Reuse [`collectBackup()`](src/lib/backup.ts#L88) — it already enumerates
   every receipt, tool, job, and photo.
2. For each item: create the Firestore doc under the new `uid` and upload its
   photo to Storage. Idempotent — skip anything already present so a retry is
   safe.
3. Mark local data migrated; from then on the hooks read/write through Firestore.

`backup.ts` stays useful as a manual export even after sync ships (offline
insurance + "give me my data" for privacy requests).

## 8. Account deletion (required)

**Apple Guideline 5.1.1(v): an app that supports account creation MUST offer
in-app account deletion.** Non-negotiable for review.

Flow: Settings → Delete account → confirm → a backend function deletes the
`users/{uid}` Firestore subtree, the Storage folder, the Auth user, and calls
`RevenueCat.logOut`. Offer a **"Download your data first"** step (reuse
`exportBackup()`) so deletion doesn't destroy their tax records without a copy.

## 9. Lapse / retention policy ⚠️

The one that must be right: **receipts are tax records — never hold them hostage
or delete them the moment someone stops paying.**

Recommended on subscription lapse:
- Syncing of **new** items stops (it's a Pro feature).
- Existing synced records stay **readable** and **exportable** (`exportBackup()`).
- Data is retained server-side for a defined window (suggest **≥ 12 months**,
  aligned to a tax year — see [taxYear.ts](src/lib/taxYear.ts)) before any
  cleanup, and only after a clear warning + export offer.

This protects trust *and* bounds the cost of churned-user data sitting in
storage (§11).

## 10. Privacy & compliance

Adding server-side storage flips the privacy story — plan for it:

- **Privacy policy rewrite** — [PRIVACY.md](PRIVACY.md) currently says data
  "stays on your phone." That stops being true for Pro users. Needs a synced-data
  section: what's stored, where (region — keep it **`syd1`/AU** to match the
  existing serverless and AU data-residency expectations), retention, deletion.
- **App Store Connect App Privacy questionnaire** — must now declare Contact Info
  + User Content, linked to identity, used for app functionality (still **not**
  tracking).
- **Australian Privacy Act** — you become a data custodian of others' financial
  records. Encryption in transit (default) + at rest (Firebase default), access
  locked by security rules, breach-response awareness.

## 11. Cost

Dominated by photo storage; metadata + auth are negligible. At ~300KB/photo and
a few hundred MB per active user, storage runs **~cents/user/month** — a fraction
of a percent of $1.99/week revenue.

| Pro users | ~Storage | Storage $/mo | Their revenue/mo |
|---|---|---|---|
| 100 | ~50 GB | ~$1 | ~$860 |
| 1,000 | ~500 GB | ~$10–12 | ~$8,600 |
| 10,000 | ~5 TB | ~$100–125 | ~$86,000 |

Free tiers (Firebase 5GB) cover launch at **$0**. Two cost levers:
- **Cache photos locally** so egress is ~one-time-per-device, not per view — the
  §6 design already does this.
- **Retention cleanup** of long-churned accounts (§9) bounds dead storage.

## 12. Provisioning checklist (blocked until org account + project exist)

1. Enroll the **org Apple Developer account** (prereq — [SUBSCRIPTION_SETUP.md](SUBSCRIPTION_SETUP.md)).
2. Configure **Sign in with Apple**: App ID capability + Services ID + key in the
   Apple Developer portal (needs the org account).
3. Create the **Firebase project** (region `australia-southeast1`). Enable
   Firestore, Cloud Storage, Auth (Apple + Email providers).
4. Add the **Capacitor Firebase** plugins / web SDK; enable Firestore offline
   persistence.
5. Publish **security rules** (§4) for Firestore + Storage.
6. In **RevenueCat**, confirm the app-user-id linking works with `logIn`.
7. Env vars: Firebase web config in `.env.local` + Vercel (mirrors the existing
   `VITE_*` pattern).

## 13. Build phases

1. **Auth** — Sign in with Apple + email; `RevenueCat.logIn` on sign-in; sign-out.
2. **Account deletion** (§8) — ship in the same release as auth (Apple requires it).
3. **Metadata sync** — Firestore-back `useRecords` + `useJobPhotos` behind an
   auth-gated store selector; offline persistence on.
4. **Photo sync** — Storage upload on add, Filesystem cache on pull.
5. **Migration** (§7) — one-time local → account on first sign-in.
6. **Lapse handling** (§9) + retention job.
7. **Privacy** (§10) — policy rewrite + App Privacy questionnaire update.

## 14. Open decisions

- **Provider** — Firebase (recommended) vs Supabase.
- **Email auth at launch** — or Sign in with Apple only for v1 of sync?
- **What syncs beyond records** — just receipts/tools/job-photos, or also jobs,
  history, and remembered prices/business details?
- **Retention window** on lapse — proposed ≥ 12 months / one tax year (§9).
- **Timing** — recommended as a **v1.1 fast-follow** after the App Store launch,
  not a launch blocker.
