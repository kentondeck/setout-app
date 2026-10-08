import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';

// Free-tier gate: the whole app shares FREE_RUNS free calculator runs, total,
// across every calculator — not per calculator. After those are spent, a
// gated calc still computes and shows the answer for a beat — then the
// result is cleared and the paywall opens (the "so close" tease). Pro users
// always pass, and never see either the flash or the paywall.
//
// Storage: { total: number } under GATE_KEY — how many free runs have been
// spent across all calculators combined. Device-local (localStorage), so a
// savvy user can clear it to reset; for a $1.99/wk builder tool that's an
// acceptable trade.

const GATE_KEY = 'sitehand_calc_gate';
// Free runs allowed in total (across every calculator) before the paywall kicks in.
const FREE_RUNS = 3;
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
  //   - Pro users: no-op.
  //   - Within the app-wide free-run allowance: records the run, no-op
  //     (they keep the answer).
  //   - After the allowance is spent: after a short beat, `onGated` fires
  //     (clear the just-shown result) and the paywall opens.
  // The caller still computes + shows the result as normal; the flash-then-hide
  // is what sells the upgrade. `calcId` is kept in the signature for future use
  // (e.g. per-calc analytics) even though the gate itself is no longer per-calc.
  gateCalc: (calcId: string, onGated?: () => void) => void;
}

export function useCalcGate(): CalcGate {
  const { isPro, showPaywall } = useSubscription();

  const gateCalc = useCallback((_calcId: string, onGated?: () => void): void => {
    if (isPro) return;
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
