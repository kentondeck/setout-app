import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';
import { CALCULATORS } from './calculators';

// Free-tier gate. Two kinds of calculator:
//   • free (CalcMeta.free) — never gated, unlimited, forever. These are what
//     make the app usable without paying at all.
//   • Pro — a non-subscriber can still run one and see the answer for a beat
//     (the "try it" tease), then the result is cleared and the paywall opens.
// Pro subscribers always pass, and never see the flash or the paywall.

const FREE_CALC_IDS = new Set<string>(CALCULATORS.filter(c => c.free).map(c => c.id));
// How long the answer stays on screen before it's cleared + the paywall opens.
const TEASE_MS = 1500;

export interface CalcGate {
  // Call this at the point a calc runs, right before setting the result.
  //   - Pro users, and every free-tier calculator: no-op.
  //   - A Pro calc for a non-subscriber: the answer renders as normal, then
  //     after a short beat `onGated` fires (clear the just-shown result) and
  //     the paywall opens. The caller still computes + shows the result; the
  //     flash-then-hide is what sells the upgrade.
  gateCalc: (calcId: string, onGated?: () => void) => void;
}

export function useCalcGate(): CalcGate {
  const { isPro, showPaywall } = useSubscription();

  const gateCalc = useCallback((calcId: string, onGated?: () => void): void => {
    if (isPro || FREE_CALC_IDS.has(calcId)) return;
    // Pro calc, non-subscriber: let them see the answer, then tease to the paywall.
    window.setTimeout(() => {
      onGated?.();
      showPaywall();
    }, TEASE_MS);
  }, [isPro, showPaywall]);

  return { gateCalc };
}
