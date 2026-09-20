# Setout Pro — Subscription Setup

The subscription system is fully scaffolded in the app. To actually ship it live, you need to configure three external services in this order:

1. **App Store Connect** (iOS product + intro offer + promo offer)
2. **Google Play Console** (Android product + intro offer + promo codes)
3. **RevenueCat** (dashboard that unifies both stores and hands the app a single entitlement)

Then set two env vars, sync Capacitor, and ship.

## What's already built

- **`src/lib/subscription.ts`** — constants for the entitlement ID (`pro`), product ID (`setout_pro_weekly`), and env-var-driven runtime detection.
- **`src/lib/SubscriptionContext.tsx`** — provider that boots RevenueCat, tracks `isPro`, and exposes `purchaseWeekly` / `restorePurchases` / `presentCodeRedemption` / `openManageSubscription` / `showPaywall`.
- **`src/lib/useCalcGate.ts`** — free-tier gate: 1 calculation per day, resets at local midnight. Pro users always pass.
- **`src/components/Paywall.tsx`** — bottom-sheet paywall with plan card, CTA, restore, redeem, and the Apple-required auto-renewal disclosure.
- **`src/pages/Settings.tsx`** — "Setout Pro" section showing active status (with Manage Subscription button) or the paywall entry (with Redeem / Restore).
- **`src/pages/StairsCalc.tsx`** — one calculator wired to the gate as a reference. Copy the pattern into every other calc page (see below).

The app runs unchanged on the web (setoutapp.com.au in a browser) — subscription enforcement is native-shell only. On dev builds without env vars set, everyone is treated as Pro so nothing gets in the way.

## Step 1 — App Store Connect

### Prerequisites
- Apple Developer account ($149/yr) — active
- Paid Applications Agreement signed, banking + tax filled in App Store Connect → Business (takes 3–5 business days to activate — do this FIRST)

### Create the subscription
1. App Store Connect → your app → **Subscriptions**
2. Create a Subscription Group called "Setout Pro" (only one product will live in it initially)
3. Inside that group, create a subscription:
   - **Product ID**: `setout_pro_weekly` (must match `WEEKLY_PRODUCT_ID` in `src/lib/subscription.ts`)
   - **Reference name**: "Setout Pro Weekly"
   - **Subscription duration**: 1 week
4. **Localised pricing**:
   - Australia: **AUD 1.99**
   - New Zealand: **NZD 1.99**
   - Other markets: leave Apple's default currency conversion, or set your own

### Add the 14-day free trial
1. Inside the subscription → **Subscription Prices** → **View All Subscription Pricing** → **Introductory Offers** → **+**
2. Type: **Free** · Duration: **2 weeks** · Territories: All
3. Eligibility: New subscribers (default)

### Add the $0.99 promo code (Offer Code)
1. Inside the subscription → **Promotional Offers** or **Offer Codes** → **+**
2. Reference name: "Setout Pro Weekly — Discounted"
3. Duration: whatever you want (e.g. Pay as you go, ongoing)
4. Localised price:
   - AU: AUD 0.99
   - NZ: NZD 0.99
5. Eligibility: any subscriber
6. Generate a batch of codes (up to 25,000 per year for Offer Codes) — export the CSV and store safely. Distribute individual codes to team leaders / promo partners.

### App metadata
- Add `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` in `ios/App/App/Info.plist` (already there — verify)
- Add `ITSAppUsesNonExemptEncryption` = `NO` to avoid the encryption prompt on every upload
- Fill Age Rating (4+), Privacy Policy URL, App Privacy questionnaire

## Step 2 — Google Play Console

### Prerequisites
- Google Play developer account ($25 one-time) — active
- Set up a Merchant account in Play Console → Setup

### Create the subscription
1. Play Console → your app → **Monetization** → **Products** → **Subscriptions** → **Create subscription**
2. **Product ID**: `setout_pro_weekly` (identical to the App Store product ID)
3. **Base plan**:
   - Auto-renewing
   - Billing period: 1 week
   - Renewal type: Auto-renewing
   - Pricing: AUD 1.99, NZD 1.99, others as chosen

### Add the 14-day free trial (Base plan offer)
1. Inside the base plan → **Offers** → **+ Add offer**
2. Type: Free trial · Duration: 14 days · Eligibility: New customers

### Add promo codes (Play Store one-time codes)
1. Play Console → **Monetization** → **Promotions** → **Promo codes** → **Create promo code campaign**
2. One-time codes give free access for a period (e.g. 1 month free). Play doesn't have a direct equivalent to Apple's ongoing-discount Offer Codes — the closest is generating free-trial codes or using Vanity Codes if enabled.
3. Alternative: create a separate `setout_pro_weekly_discount` base plan priced at AUD 0.99 / NZD 0.99, gated to users who redeem a code via your own flow. This is a bigger build — the Apple Offer Code system doesn't have a clean Play equivalent for ongoing discounts.

## Step 3 — RevenueCat

### Create project
1. Sign up at [revenuecat.com](https://www.revenuecat.com/) (free up to $2.5k MRR)
2. Create a new project called "Setout"
3. Under **Apps**, add:
   - iOS app: bundle ID `com.setout.app` — upload App Store Connect shared secret (Users and Access → Keys → App-Specific Shared Secret)
   - Android app: package name matching Play → upload Play Console service account JSON

### Wire products to an entitlement
1. **Products** → **+ New** — import `setout_pro_weekly` from both stores
2. **Entitlements** → **+ New entitlement** — name it **`pro`** (must match `PRO_ENTITLEMENT_ID` in `src/lib/subscription.ts`)
3. Attach the weekly product to the `pro` entitlement
4. **Offerings** → **Current** → add a package labelled `$rc_weekly` pointing to the weekly product

### Get API keys
1. **API keys** in RevenueCat project settings
2. Copy the **public iOS key** and **public Android key**

## Step 4 — Env vars in the app

Create `.env.local` in the project root (this is git-ignored):

```
VITE_REVENUECAT_IOS_KEY=appl_XXXXXXXXXXXX
VITE_REVENUECAT_ANDROID_KEY=goog_XXXXXXXXXXXX
```

Also set these in your Vercel environment (Project Settings → Environment Variables) so production builds get them.

## Step 5 — Ship it

```bash
npm run build:ios
```

This builds the web bundle with the env vars baked in, syncs to iOS, then opens Xcode. Archive + upload to App Store Connect via Xcode Organizer.

For Android (once you add `@capacitor/android` and set up the Android project):

```bash
npm run build && npx cap sync android && npx cap open android
```

## Step 6 — Test the flow

1. **TestFlight (iOS)** — add yourself + a couple of tradesperson mates as internal testers. Purchases in TestFlight use sandbox accounts (no real money). Verify:
   - 1st free calc runs
   - 2nd free calc same day hits paywall
   - "Start free trial" enters purchase flow → completes → `isPro` flips → gate opens
   - Restore purchases works from a fresh install
   - Redeem code opens the App Store sheet
2. **Play Internal Testing** — same drill

## Reference — gating a calculator

Copy this pattern into every calculator that should be paywalled. Currently only Stairs is gated (as the reference).

```tsx
// 1. Import
import { useSubscription } from '../lib/SubscriptionContext';
import { useCalcGate } from '../lib/useCalcGate';

// 2. In the component
const { showPaywall } = useSubscription();
const gate = useCalcGate();

// 3. In handleCalculate, right after input validation
if (!gate.tryUse()) {
  showPaywall();
  return;
}
```

Free calculators (Home, Settings, History, Support, Privacy) don't need this.

## Reference — checking Pro state anywhere

```tsx
const { isPro, showPaywall } = useSubscription();

if (feature === 'photoQuote' && !isPro) {
  showPaywall();
  return;
}
```

## Notes

- **Bypass risk**: the daily calc counter lives in localStorage. Tech-savvy users can clear it. For a $1.99/wk tool, acceptable — server-backed counters need a backend, which is out of scope for "internal only" architecture.
- **Web version**: intentionally not paywalled. Only the native iOS/Android apps enforce subscription. If you want to paywall the web too, add Stripe + a login system.
- **Offer Codes vs. team plans**: what's wired here is the standard "individual with discount code" pattern. If you later want proper team-seat management (boss buys N seats, hands out codes that don't cost the team member anything), that's a separate backend build (see the "internal only" team-code architecture discussed in chat).
