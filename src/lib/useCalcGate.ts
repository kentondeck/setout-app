import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';

// Free-tier gate: each calculator can be run once for free. After that first
// free run, a gated calc still computes and shows the answer for a beat — then
// the result is cleared and the paywall opens (the "so close" tease). Pro users
// always pass, and never see either the flash or the paywall.
//
// Storage: { usedIds: string[] } under GATE_KEY — the ids of calculators that
// have spent their one free run. Device-local (localStorage), so a savvy user
// can clear it to reset; for a $1.99/wk builder tool that's an acceptable
// trade (same as the previous daily-counter approach).

const GATE_KEY = 'sitehand_calc_gate';
// How long the answer stays on screen before it's cleared + the paywall opens.
const TEASE_MS = 700;

interface GateState {
  usedIds: string[];
}

function readGate(): GateState {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return { usedIds: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const ids = (parsed as { usedIds?: unknown }).usedIds;
      if (Array.isArray(ids)) return { usedIds: ids.filter((x): x is string => typeof x === 'string') };
    }
    return { usedIds: [] };
  } catch {
    return { usedIds: [] };
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
  //   - First run of `calcId`: records the free run, no-op (they keep the answer).
  //   - Any run after that: after a short beat, `onGated` fires (clear the
  //     just-shown result) and the paywall opens.
  // The caller still computes + shows the result as normal; the flash-then-hide
  // is what sells the upgrade.
  gateCalc: (calcId: string, onGated?: () => void) => void;
}

export function useCalcGate(): CalcGate {
  const { isPro, showPaywall } = useSubscription();

  const gateCalc = useCallback((calcId: string, onGated?: () => void): void => {
    if (isPro) return;
    const state = readGate();
    if (!state.usedIds.includes(calcId)) {
      writeGate({ usedIds: [...state.usedIds, calcId] });
      return; // first free run — let them keep the answer
    }
    // Free run already spent: let the answer render, then pull it + paywall.
    window.setTimeout(() => {
      onGated?.();
      showPaywall();
    }, TEASE_MS);
  }, [isPro, showPaywall]);

  return { gateCalc };
}
