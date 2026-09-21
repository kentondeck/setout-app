import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PRO_ENTITLEMENT_ID, WEEKLY_PRODUCT_ID, getApiKey, isSubscriptionRuntime } from './subscription';

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
  // Localised price string from RevenueCat (e.g. "$1.99 / week"). Null until
  // the first fetch resolves or if we're not in a subscription runtime.
  weeklyPriceString: string | null;
  // Kick off the platform purchase flow for the weekly plan (with free trial
  // if the user hasn't used one). Resolves when the sheet closes — check
  // isPro afterwards to see if the purchase went through.
  purchaseWeekly: () => Promise<void>;
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
}

const SubscriptionContext = createContext<SubscriptionState>({
  isPro: true, // default to Pro on web / dev — nothing paywalled
  isReady: true,
  weeklyPriceString: null,
  purchaseWeekly: async () => {},
  restorePurchases: async () => {},
  presentCodeRedemption: async () => {},
  openManageSubscription: async () => {},
  paywallOpen: false,
  showPaywall: () => {},
  hidePaywall: () => {},
  lastError: null,
  clearError: () => {},
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  // On web / dev, isPro is always true so the paywall is a no-op.
  const enforced = isSubscriptionRuntime();
  const [isPro, setIsPro] = useState<boolean>(!enforced);
  const [isReady, setIsReady] = useState<boolean>(!enforced);
  const [weeklyPriceString, setWeeklyPriceString] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const initialised = useRef(false);

  // On mount (native only), configure RC + fetch offerings + customer info.
  useEffect(() => {
    if (!enforced || initialised.current) return;
    initialised.current = true;
    let cancelled = false;

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

        // Fetch offerings so the paywall has a localised price to show.
        try {
          const offerings = await rc.Purchases.getOfferings();
          const current = offerings.current;
          if (current) {
            // Grab the weekly package — either the standard "$rc_weekly" slot
            // or whichever available package has our product ID.
            const packages = current.availablePackages ?? [];
            const weekly = packages.find(p => p.product?.identifier === WEEKLY_PRODUCT_ID)
              ?? packages.find(p => p.identifier === '$rc_weekly');
            if (weekly && !cancelled) {
              setWeeklyPriceString(weekly.product?.priceString ?? null);
            }
          }
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

  const purchaseWeekly = useCallback(async () => {
    setLastError(null);
    const rc = await getRc();
    if (!rc) {
      setLastError('Subscriptions are only available in the Setout iOS / Android app.');
      return;
    }
    try {
      const offerings = await rc.Purchases.getOfferings();
      const current = offerings.current;
      const packages = current?.availablePackages ?? [];
      const weekly = packages.find(p => p.product?.identifier === WEEKLY_PRODUCT_ID)
        ?? packages.find(p => p.identifier === '$rc_weekly');
      if (!weekly) {
        setLastError('Weekly plan is not available right now. Try again in a moment.');
        return;
      }
      await rc.Purchases.purchasePackage({ aPackage: weekly });
      await refreshCustomerInfo();
    } catch (e) {
      const err = e as { userCancelled?: boolean; message?: string };
      // User-cancelled is a normal flow, not an error — just silently no-op.
      if (err.userCancelled) return;
      setLastError(err.message ?? 'Purchase failed. Please try again.');
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

  const value = useMemo<SubscriptionState>(() => ({
    isPro,
    isReady,
    weeklyPriceString,
    purchaseWeekly,
    restorePurchases,
    presentCodeRedemption,
    openManageSubscription,
    paywallOpen,
    showPaywall,
    hidePaywall,
    lastError,
    clearError,
  }), [isPro, isReady, weeklyPriceString, purchaseWeekly, restorePurchases, presentCodeRedemption, openManageSubscription, paywallOpen, showPaywall, hidePaywall, lastError, clearError]);

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}
