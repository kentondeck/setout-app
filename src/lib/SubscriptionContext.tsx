import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PurchasesOffering, PurchasesOfferings, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import type { PlanId } from './subscription';
import {
  PLAN_PERIOD_NOUN,
  PRO_ENTITLEMENT_ID,
  comparePlans,
  formatTrial,
  getApiKey,
  isSubscriptionRuntime,
  planFromPeriod,
  planFromProductId,
} from './subscription';

// One purchasable plan, resolved from a RevenueCat offering. Everything the
// paywall renders comes from the store — we never hardcode a price, a period,
// or a trial length, because any drift from what the user is actually billed is
// an automatic App Store rejection under 2.1(b).
export interface PlanOption {
  id: PlanId;
  pkg: PurchasesPackage;
  // The amount actually charged, e.g. "$39.99". Always the most prominent
  // figure on the paywall (guideline 3.1.2(c)).
  priceString: string;
  // Period noun for the price line: "year", "month", "week".
  periodNoun: string;
  // Store-computed weekly equivalent, e.g. "$0.77". Secondary copy only —
  // never the headline figure.
  perWeekString: string | null;
  // Annualised cost, used to work out the saving against the shortest plan
  // without hardcoding either price. Compared on a yearly basis rather than a
  // weekly one because the store derives a weekly figure for monthly plans by
  // dividing by 4, and a month is 4.35 weeks — close enough for "about $x a
  // week" display copy, but it inflates a headline saving by three points.
  pricePerYear: number | null;
  // "14-day free trial", or null when this plan has no intro offer.
  trialLabel: string | null;
}

// Everything the app UI needs about the subscription. Kept small on purpose —
// the paywall reads price + purchase actions, the calc gate just reads isPro.
interface SubscriptionState {
  // True when the user is entitled to Pro (active weekly subscription, or
  // free-trial period, or promo-code offer). Web + dev always treat as true
  // so nothing is paywalled outside the native shell.
  isPro: boolean;
  // False during first RC fetch — used by the paywall to show a spinner
  // instead of an empty price. Also true on web (nothing to load).
  isReady: boolean;
  // Every plan the store currently offers, longest commitment first. Empty
  // until the first fetch resolves, or when we're not in a subscription
  // runtime. The paywall renders exactly what's in here.
  plans: PlanOption[];
  // Kick off the platform purchase flow for a plan (with free trial if the
  // user is eligible). Resolves when the sheet closes — check isPro
  // afterwards to see if the purchase went through.
  purchase: (planId: PlanId) => Promise<void>;
  // Restore purchases from the user's App Store / Play Store account.
  // Apple guideline requires this button on every paywall.
  restorePurchases: () => Promise<void>;
  // Open the platform's promo-code redemption sheet (iOS only). On Android,
  // deep-link to the Play Store subscription page — users redeem there.
  presentCodeRedemption: () => Promise<void>;
  // Open the Manage Subscription page on the current platform.
  openManageSubscription: () => Promise<void>;
  // Show / hide the paywall bottom sheet from anywhere in the app.
  paywallOpen: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  // Last error message from a purchase / restore attempt — cleared on next
  // action. Paywall surfaces this in a small footer if set.
  lastError: string | null;
  clearError: () => void;
  // True while a purchase is in flight — the paywall CTA reflects this so a tap
  // always gives feedback and can't be double-fired.
  purchasing: boolean;
}

const SubscriptionContext = createContext<SubscriptionState>({
  isPro: true, // default to Pro on web / dev — nothing paywalled
  isReady: true,
  plans: [],
  purchase: async () => {},
  restorePurchases: async () => {},
  presentCodeRedemption: async () => {},
  openManageSubscription: async () => {},
  paywallOpen: false,
  showPaywall: () => {},
  hidePaywall: () => {},
  lastError: null,
  clearError: () => {},
  purchasing: false,
});

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// We import the RC SDK lazily — the package only ships with native code that
// works inside Capacitor, so importing at module scope in a browser context
// would crash the web build. Cache the resolved module so we don't re-import
// on every call.
type RcModule = typeof import('@revenuecat/purchases-capacitor');
let cachedRc: RcModule | null = null;
async function getRc(): Promise<RcModule | null> {
  if (cachedRc) return cachedRc;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    cachedRc = await import('@revenuecat/purchases-capacitor');
    return cachedRc;
  } catch {
    return null;
  }
}

interface CustomerInfo {
  entitlements?: {
    active?: Record<string, unknown>;
  };
}

// Flatten every offering into one list, current first. RC only returns a
// package when the product is purchasable in App Store Connect AND attached to
// an offering — and a product attached to a non-current offering used to read
// as "not available" even though everything was configured, so we look past
// `current` deliberately.
function allOfferings(offerings: PurchasesOfferings): PurchasesOffering[] {
  const seen = new Set<PurchasesOffering>();
  const list: PurchasesOffering[] = [];
  if (offerings.current) { list.push(offerings.current); seen.add(offerings.current); }
  for (const o of Object.values(offerings.all ?? {})) {
    if (o && !seen.has(o)) { list.push(o); seen.add(o); }
  }
  return list;
}

// Build the paywall's plan list from whatever the store returns, classifying
// each package by its own billing period. Driving this off the store rather
// than a hardcoded product list means adding or retiring a plan is an App Store
// Connect change with no app release.
function collectPlans(offerings: PurchasesOfferings): PlanOption[] {
  const byPlan = new Map<PlanId, PlanOption>();

  for (const off of allOfferings(offerings)) {
    for (const pkg of off.availablePackages ?? []) {
      const product = pkg.product;
      if (!product?.priceString) continue;

      const id = planFromPeriod(product.subscriptionPeriod) ?? planFromProductId(product.identifier);
      if (!id || byPlan.has(id)) continue;

      byPlan.set(id, {
        id,
        pkg,
        priceString: product.priceString,
        periodNoun: PLAN_PERIOD_NOUN[id],
        // Only worth showing when it differs from the billed amount — on the
        // weekly plan they're the same number.
        perWeekString: id === 'weekly' ? null : product.pricePerWeekString ?? null,
        pricePerYear: product.pricePerYear ?? null,
        trialLabel: formatTrial(product.introPrice),
      });
    }
  }

  return [...byPlan.values()].sort((a, b) => comparePlans(a.id, b.id));
}

// A product's intro offer says what the plan offers, not what this user can
// have. Apple grants one intro offer per subscription group per Apple ID, so
// anyone who already used the trial on the weekly plan gets none on the annual
// one. Advertising "14-day free trial" and then charging immediately is exactly
// the price/offer mismatch that gets paywalls rejected under 2.1(b) — so the
// label only survives when the store confirms this user is eligible.
async function applyTrialEligibility(rc: RcModule, plans: PlanOption[]): Promise<PlanOption[]> {
  // iOS only. Android always reports UNKNOWN; Play evaluates trial eligibility
  // itself and states it on its own purchase sheet.
  if (Capacitor.getPlatform() !== 'ios') return plans;
  const offered = plans.filter(p => p.trialLabel);
  if (offered.length === 0) return plans;

  const withoutTrials = () => plans.map(p => (p.trialLabel ? { ...p, trialLabel: null } : p));

  try {
    const result = await rc.Purchases.checkTrialOrIntroductoryPriceEligibility({
      productIdentifiers: offered.map(p => p.pkg.product.identifier),
    });
    const eligible = rc.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
    return plans.map(p => {
      if (!p.trialLabel) return p;
      // UNKNOWN counts as ineligible — RevenueCat's own guidance is to show
      // non-intro pricing rather than risk a misleading offer.
      return result[p.pkg.product.identifier]?.status === eligible ? p : { ...p, trialLabel: null };
    });
  } catch (e) {
    console.warn('[Subscription] trial eligibility check failed', e);
    return withoutTrials();
  }
}

// Offerings plus eligibility — the paywall should never read one without the
// other, so they're fetched together.
async function loadPlans(rc: RcModule): Promise<PlanOption[]> {
  const offerings = await rc.Purchases.getOfferings();
  return applyTrialEligibility(rc, collectPlans(offerings));
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // On web / dev, isPro is always true so the paywall is a no-op.
  const enforced = isSubscriptionRuntime();
  const [isPro, setIsPro] = useState<boolean>(!enforced);
  const [isReady, setIsReady] = useState<boolean>(!enforced);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const initialised = useRef(false);

  // On mount (native only), configure RC + fetch offerings + customer info.
  useEffect(() => {
    if (!enforced || initialised.current) return;
    initialised.current = true;
    let cancelled = false;

    // Watchdog: if a native RC call (configure / getCustomerInfo) ever stalls,
    // `isReady` would otherwise stay false forever and the paywall CTA would be
    // permanently disabled — a dead button that does nothing on tap. Guarantee
    // readiness flips within a few seconds no matter what the SDK does. The
    // purchase handler re-fetches offerings on its own, so it's safe to let the
    // user tap even if init never completed.
    const readyWatchdog = window.setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 6000);

    (async () => {
      const rc = await getRc();
      const apiKey = getApiKey();
      if (!rc || !apiKey) {
        // Plugin missing or key missing — degrade to "not enforced" so the
        // app is usable, and log for the dev.
        console.warn('[Subscription] RevenueCat SDK or API key unavailable — subscription enforcement disabled');
        if (!cancelled) {
          setIsPro(true);
          setIsReady(true);
        }
        return;
      }

      try {
        await rc.Purchases.configure({ apiKey });
        // Pull current entitlement state so the first render is correct.
        const info = (await rc.Purchases.getCustomerInfo()) as unknown as { customerInfo: CustomerInfo };
        const activeEnts = info.customerInfo?.entitlements?.active ?? {};
        const hasPro = Object.prototype.hasOwnProperty.call(activeEnts, PRO_ENTITLEMENT_ID);
        if (!cancelled) setIsPro(hasPro);

        // Fetch offerings so the paywall has localised prices to show.
        try {
          const resolved = await loadPlans(rc);
          if (!cancelled) setPlans(resolved);
        } catch (e) {
          console.warn('[Subscription] getOfferings failed', e);
        }
      } catch (e) {
        console.error('[Subscription] RevenueCat init failed', e);
        if (!cancelled) {
          // On init failure, don't lock users out — treat as not enforced.
          setIsPro(true);
        }
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(readyWatchdog);
    };
  }, [enforced]);

  // Re-sync entitlement state after any purchase / restore attempt.
  const refreshCustomerInfo = useCallback(async () => {
    const rc = await getRc();
    if (!rc) return;
    try {
      const info = (await rc.Purchases.getCustomerInfo()) as unknown as { customerInfo: CustomerInfo };
      const activeEnts = info.customerInfo?.entitlements?.active ?? {};
      setIsPro(Object.prototype.hasOwnProperty.call(activeEnts, PRO_ENTITLEMENT_ID));
    } catch (e) {
      console.warn('[Subscription] refreshCustomerInfo failed', e);
    }
  }, []);

  const purchase = useCallback(async (planId: PlanId) => {
    setLastError(null);
    setPurchasing(true);
    try {
      const rc = await getRc();
      if (!rc) {
        setLastError('Subscriptions are only available in the Setout iOS / Android app.');
        return;
      }
      // Re-fetch rather than trusting the cached plan list — init may never
      // have completed (the readiness watchdog lets the user tap regardless).
      const resolved = await loadPlans(rc);
      setPlans(resolved);
      const selected = resolved.find(p => p.id === planId);
      if (!selected) {
        console.warn('[Subscription] plan not available', { planId, resolved: resolved.map(p => p.id) });
        setLastError('That plan isn’t available right now. Please try again in a moment.');
        return;
      }
      await rc.Purchases.purchasePackage({ aPackage: selected.pkg });
      await refreshCustomerInfo();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      // User-cancelled is a normal flow, not an error — just silently no-op.
      if (err.userCancelled) return;
      setLastError(err.message ?? 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }, [refreshCustomerInfo]);

  const restorePurchases = useCallback(async () => {
    setLastError(null);
    const rc = await getRc();
    if (!rc) {
      setLastError('Restore is only available in the Setout iOS / Android app.');
      return;
    }
    try {
      await rc.Purchases.restorePurchases();
      await refreshCustomerInfo();
    } catch (e) {
      const err = e as { message?: string };
      setLastError(err.message ?? 'Restore failed. Please try again.');
    }
  }, [refreshCustomerInfo]);

  const presentCodeRedemption = useCallback(async () => {
    setLastError(null);
    const rc = await getRc();
    if (!rc) return;
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      // iOS 14+ shows the native App Store promo-code sheet.
      try {
        await rc.Purchases.presentCodeRedemptionSheet();
      } catch (e) {
        console.warn('[Subscription] presentCodeRedemptionSheet failed', e);
      }
    } else if (platform === 'android') {
      // Android doesn't have an in-app code redemption sheet — users redeem
      // Play Store promo codes on the Play Store subscription page.
      try {
        await rc.Purchases.showInAppMessages();
      } catch (e) {
        console.warn('[Subscription] showInAppMessages failed', e);
      }
    }
  }, []);

  const openManageSubscription = useCallback(async () => {
    // The Capacitor RevenueCat SDK doesn't expose showManageSubscriptions the
    // way the native Swift / Kotlin SDKs do — open the platform's own
    // subscription-management URL instead.
    try {
      const url = Capacitor.getPlatform() === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
      window.open(url, '_blank');
    } catch (e) {
      console.warn('[Subscription] openManageSubscription failed', e);
    }
  }, []);

  const showPaywall = useCallback(() => setPaywallOpen(true), []);
  const hidePaywall = useCallback(() => setPaywallOpen(false), []);
  const clearError = useCallback(() => setLastError(null), []);

  // The moment Pro is granted (a purchase or restore flips the entitlement),
  // drop the paywall automatically — the user shouldn't have to tap it away
  // after a successful purchase.
  useEffect(() => {
    if (isPro) setPaywallOpen(false);
  }, [isPro]);

  const value = useMemo<SubscriptionState>(() => ({
    isPro,
    isReady,
    plans,
    purchase,
    restorePurchases,
    presentCodeRedemption,
    openManageSubscription,
    paywallOpen,
    showPaywall,
    hidePaywall,
    lastError,
    clearError,
    purchasing,
  }), [isPro, isReady, plans, purchase, restorePurchases, presentCodeRedemption, openManageSubscription, paywallOpen, showPaywall, hidePaywall, lastError, clearError, purchasing]);

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}
