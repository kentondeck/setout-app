# Setout — Release Handover (blockers for Nick)

Everything on the code side is committed, type-checks clean, and (once pushed)
is on `main`. What's left before a public App Store release is **build config**,
**RevenueCat**, and **App Store Connect** — the bits that need Xcode Cloud /
dashboard access. This note covers those.

Companion docs: `SUBSCRIPTION_SETUP.md` (full RevenueCat steps),
`APP_STORE_LISTING.md` (all listing copy + privacy answers).

---

## How the app is built (important context)

- Web app: React + Vite, deployed to Vercel at `setoutapp.com.au`.
- iOS: Capacitor shell. `webDir: dist` — **the web is bundled into the app at
  build time**, so **web changes need a new build** to reach TestFlight (they do
  NOT appear from a Vercel deploy alone).
- Builds go through **Xcode Cloud**.

## 🔴 Blocker 1 — Native config points at a dead dev server

`ios/App/App/capacitor.config.json` currently has:

```json
"server": { "url": "http://192.168.1.71:5173", "cleartext": true }
```

That's a leftover from `npm run ios:live` (LAN hot-reload). **If a build is
archived with this, the app opens to a blank screen off that network.**

**Action:** ensure the build runs a clean **release sync** so this regenerates
correctly — `npm run build:ios` (or `ios:release`), which runs `cap sync` with
`CAP_SERVER_URL` unset. Confirm the **Xcode Cloud workflow does this** (build web
+ `cap sync`) rather than archiving the committed native project as-is.

**Also decide:** should release be **bundled** (drop `server.url` entirely →
proper offline app, current de-facto behaviour) or **remote** (point at
`setoutapp.com.au`)? The TS config (`capacitor.config.ts`) sets the production
URL, but real builds behave bundled. Pick one and make the sync match.

## 🔴 Blocker 2 — RevenueCat / paywall is dormant

`VITE_REVENUECAT_IOS_KEY` is not set anywhere, so the app treats **everyone as
Pro** and the paywall never shows.

**Action (see `SUBSCRIPTION_SETUP.md` steps 1–4):**
1. App Store Connect → create subscription `setout_pro_weekly` (1 week), add the
   14-day free-trial intro offer (+ offer codes if wanted).
2. RevenueCat → project, entitlement **`pro`**, attach the product, add a
   `$rc_weekly` package to the current offering, copy the **public iOS key**.
3. Set `VITE_REVENUECAT_IOS_KEY=appl_…` in the **build environment** (Xcode Cloud
   env vars — because the web bundle is built there — and Vercel for the web).

Gate behaviour once live: **two free runs per calculator**, then the answer
flashes ~700 ms and the paywall opens. Pro users bypass it.

## 🔴 Blocker 3 — Push + build + distribute

1. `git push origin main` (latest is ahead by a commit or two).
2. Trigger the Xcode Cloud build off `main` (with Blockers 1 & 2 handled).
3. Add the build to the TestFlight internal testing group.

---

## 🟠 App Store Connect submission checklist
- Subscription product + 14-day intro offer (+ offer codes) — as above.
- Listing content from `APP_STORE_LISTING.md`: name, **subtitle (still to be
  finalised)**, description, keywords, promo text, support + privacy URLs.
- **Screenshots** per required device size — not yet made.
- App Privacy questionnaire + Age rating (4+) — answers drafted in the listing doc.
- Confirm the **Paid Applications Agreement** shows *active* (banking is done).
- `ITSAppUsesNonExemptEncryption` is already `NO` in Info.plist. ✅

## 🟡 QA on the TestFlight build
- Paywall: 1st + 2nd run of a calc free → 3rd run flashes then paywall →
  Start trial → purchase completes → Pro unlocks → **Restore** works → **Redeem
  code** opens the App Store sheet.
- Onboarding + refreshed Home render on a real device.
- Add-to-job / new-job sheets: keyboard no longer covers the buttons.

## Open product decisions (Austin)
- **App Store subtitle** — "Construction Calculator" vs "The builder's toolkit".
- **JobDetailPage diagrams** — decking/framing diagrams were removed from the
  calculators; leave them on saved-job detail, or remove there too?

---

_Native version is a Xcode build setting (`MARKETING_VERSION`) — set it to
`1.0.0` for release. `package.json` and the in-app version already read 1.0.0._
