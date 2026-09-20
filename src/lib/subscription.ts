// Subscription plumbing for Setout Pro.
//
// The app runs in two contexts:
//   1. Native (iOS / Android via Capacitor) — RevenueCat SDK handles the
//      IAP flow, gives us the entitlement state.
//   2. Web (setoutapp.com.au in a browser) — no IAP, treat every user as Pro
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

// One-liner formatter so paywall + settings both show the same string when
// showing the localised RC price (Purchases already returns the locale-aware
// formatted price, so we just return what it gives us).
export function formatPrice(priceString: string | null | undefined): string {
  if (!priceString) return '';
  return priceString;
}
