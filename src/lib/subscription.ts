// Subscription plumbing for Setout Pro.
//
// The app runs in two contexts:
//   1. Native (iOS / Android via Capacitor) — RevenueCat SDK handles the
//      IAP flow, gives us the entitlement state.
//   2. Web (www.setoutapp.co.nz in a browser) — no IAP, treat every user as Pro
//      so nothing is paywalled on the web. Subscription enforcement lives
//      inside the app stores' native shell only.
//
// The single source of truth for "can this user use paid features" is
// `SubscriptionState.isPro`. Everything else in the app reads that.

import { Capacitor } from '@capacitor/core';

// The RevenueCat entitlement ID we configure in the RC dashboard. Must match
// the identifier assigned to the weekly product ("setout_pro_weekly") on the
// Entitlements screen. Referenced everywhere the app asks "is this user Pro?".
export const PRO_ENTITLEMENT_ID = 'pro';

// Product identifiers — must match the products created in App Store Connect
// AND Google Play Console (identical strings on both stores so a single
// RevenueCat product maps to both).
export const WEEKLY_PRODUCT_ID = 'setout_pro_weekly';
export const ANNUAL_PRODUCT_ID = 'setout_pro_annual';

// Billing periods we present on the paywall. Offering a longer commitment
// alongside the weekly plan matters for App Store review: a weekly-only
// subscription on a utility app is the pattern reviewers flag under 3.1.2,
// because it reads as recurring billing for one-off use rather than access to
// an ongoing service.
export type PlanId = 'weekly' | 'monthly' | 'annual';

// ISO 8601 subscription periods as returned by StoreKit / Play, mapped to the
// plan we show. The store is the source of truth for which plans exist — we
// render whatever the offering returns rather than assuming a fixed set.
const PERIOD_TO_PLAN: Record<string, PlanId> = {
  P1W: 'weekly',
  P7D: 'weekly',
  P1M: 'monthly',
  P1Y: 'annual',
  P12M: 'annual',
};

export function planFromPeriod(subscriptionPeriod: string | null | undefined): PlanId | null {
  if (!subscriptionPeriod) return null;
  return PERIOD_TO_PLAN[subscriptionPeriod.toUpperCase()] ?? null;
}

// Fallback for stores that don't report a period (StoreKit 1 on older iOS, and
// Amazon). Our own product ids match exactly; the substring checks cover any
// plan added in App Store Connect that follows the same naming.
export function planFromProductId(productId: string | null | undefined): PlanId | null {
  if (!productId) return null;
  if (productId === WEEKLY_PRODUCT_ID) return 'weekly';
  if (productId === ANNUAL_PRODUCT_ID) return 'annual';
  const id = productId.toLowerCase();
  if (id.includes('annual') || id.includes('year')) return 'annual';
  if (id.includes('month')) return 'monthly';
  if (id.includes('week')) return 'weekly';
  return null;
}

// Noun used after the price ("$39.99 / year") and in the auto-renewal small
// print ("renews yearly").
export const PLAN_PERIOD_NOUN: Record<PlanId, string> = {
  weekly: 'week',
  monthly: 'month',
  annual: 'year',
};

export const PLAN_RENEWAL_ADVERB: Record<PlanId, string> = {
  weekly: 'weekly',
  monthly: 'monthly',
  annual: 'yearly',
};

// Longest commitment first — the annual plan is the one we present as the
// default, so it leads.
const PLAN_ORDER: PlanId[] = ['annual', 'monthly', 'weekly'];

export function comparePlans(a: PlanId, b: PlanId): number {
  return PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b);
}

// Public RevenueCat API keys, injected via Vite env vars at build time. These
// are PUBLIC (safe to ship) — they only grant read-only entitlement checks
// and the ability to initiate purchases through the platform's own IAP flow.
// Set in .env.local for dev, and in your CI / deployment env for production.
const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined;
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY as string | undefined;

// True only when the current runtime is a native platform AND we have a key
// for it. On web, or in dev without keys set, subscription is not enforced.
export function isSubscriptionRuntime(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return !!IOS_KEY;
  if (platform === 'android') return !!ANDROID_KEY;
  return false;
}

export function getApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return IOS_KEY ?? null;
  if (platform === 'android') return ANDROID_KEY ?? null;
  return null;
}

// Free-trial copy, built from the store's own intro offer rather than a
// hardcoded string. If the offer is changed in App Store Connect the paywall
// follows automatically — a mismatch between the stated trial and the real one
// is a 2.1(b) rejection.
export function formatTrial(intro: { price: number; periodUnit: string; periodNumberOfUnits: number } | null): string | null {
  if (!intro || intro.price > 0) return null;
  const unit = intro.periodUnit.toLowerCase().replace(/s$/, '');
  if (!unit || intro.periodNumberOfUnits <= 0) return null;
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}
