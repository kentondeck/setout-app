import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';
import { CALCULATORS } from './calculators';

// Free-tier gate. Two kinds of calculator:
//   • free (CalcMeta.free) — never gated, unlimited, forever. These are what
//     make the app usable without paying at all.
//   • Pro — shares FREE_RUNS sample runs across all of them, total. After
//     those are spent a Pro calc still computes and shows the answer for a
//     beat, then the result is cleared and the paywall opens (the "so close"
//     tease).
// Pro subscribers always pass, and never see either the flash or the paywall.
//
// Storage: { total: number } under GATE_KEY — how many sample runs have been
// spent across the Pro calculators combined. Device-local (localStorage), so a
// savvy user can clear it to reset; for a builder tool at this price that's an
// acceptable trade.

const GATE_KEY = 'sitehand_calc_gate';
// Sample runs allowed across the Pro calculators before the paywall kicks in.
const FREE_RUNS = 3;

const FREE_CALC_IDS = new Set<string>(CALCULATORS.filter(c => c.free).map(c => c.id));
// How long the answer stays on screen before it's cleared + the paywall opens.
const TEASE_MS = 700;

interface GateState {
  total: number;
}

function readGate(): GateState {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return { total: 0 };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { total?: unknown; counts?: unknown; usedIds?: unknown };
      // Current shape: { total: n }
      if (typeof obj.total === 'number' && obj.total >= 0) return { total: obj.total };
      // Legacy shape: { counts: { [calcId]: n } } (free runs were per-calculator) —
      // migrate by summing whatever was already spent.
      if (obj.counts && typeof obj.counts === 'object') {
        const sum = Object.values(obj.counts as Record<string, unknown>)
          .reduce<number>((acc, v) => acc + (typeof v === 'number' && v >= 0 ? v : 0), 0);
        return { total: sum };
      }
      // Older legacy shape: { usedIds: string[] } — each spent id counts as one run.
      if (Array.isArray(obj.usedIds)) return { total: obj.usedIds.length };
    }
    return { total: 0 };
  } catch {
    return { total: 0 };
  }
}

function writeGate(state: GateState): void {
  try {
    localStorage.setItem(GATE_KEY, JSON.stringify(state));
  } catch {
    // Storage full / disabled — degrade gracefully by not persisting.
  }
}

export interface CalcGate {
  // Call this at the point a calc runs, right before setting the result.
  //   - Pro users, and every free-tier calculator: no-op.
  //   - Within the sample allowance on a Pro calc: records the run, no-op
  //     (they keep the answer).
  //   - After the allowance is spent: after a short beat, `onGated` fires
  //     (clear the just-shown result) and the paywall opens.
  // The caller still computes + shows the result as normal; the flash-then-hide
  // is what sells the upgrade.
  gateCalc: (calcId: string, onGated?: () => void) => void;
}

export function useCalcGate(): CalcGate {
  const { isPro, showPaywall } = useSubscription();

  const gateCalc = useCallback((calcId: string, onGated?: () => void): void => {
    if (isPro || FREE_CALC_IDS.has(calcId)) return;
    const state = readGate();
    if (state.total < FREE_RUNS) {
      writeGate({ total: state.total + 1 });
      return; // still within the free allowance — let them keep the answer
    }
    // Free runs spent: let the answer render, then pull it + open the paywall.
    window.setTimeout(() => {
      onGated?.();
      showPaywall();
    }, TEASE_MS);
  }, [isPro, showPaywall]);

  return { gateCalc };
}
