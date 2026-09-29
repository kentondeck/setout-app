import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';

// Free-tier gate: each calculator can be run FREE_RUNS times for free. After
// those free runs are spent, a gated calc still computes and shows the answer
// for a beat — then the result is cleared and the paywall opens (the "so close"
// tease). Pro users always pass, and never see either the flash or the paywall.
//
// Storage: { counts: { [calcId]: number } } under GATE_KEY — how many free runs
// each calculator has spent. Device-local (localStorage), so a savvy user can
// clear it to reset; for a $1.99/wk builder tool that's an acceptable trade.

const GATE_KEY = 'sitehand_calc_gate';
// Free runs allowed per calculator before the paywall kicks in.
const FREE_RUNS = 2;
// How long the answer stays on screen before it's cleared + the paywall opens.
const TEASE_MS = 700;

interface GateState {
  counts: Record<string, number>;
}

function readGate(): GateState {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return { counts: {} };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as { counts?: unknown; usedIds?: unknown };
      // Current shape: { counts: { [id]: n } }
      if (obj.counts && typeof obj.counts === 'object') {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(obj.counts as Record<string, unknown>)) {
          if (typeof v === 'number' && v >= 0) out[k] = v;
        }
        return { counts: out };
      }
      // Legacy shape: { usedIds: string[] } — each spent id counts as one run.
      if (Array.isArray(obj.usedIds)) {
        const out: Record<string, number> = {};
        for (const id of obj.usedIds) if (typeof id === 'string') out[id] = 1;
        return { counts: out };
      }
    }
    return { counts: {} };
  } catch {
    return { counts: {} };
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
  //   - Within the free-run allowance for `calcId`: records the run, no-op
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
    if (isPro) return;
    const state = readGate();
    const used = state.counts[calcId] ?? 0;
    if (used < FREE_RUNS) {
      writeGate({ counts: { ...state.counts, [calcId]: used + 1 } });
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
