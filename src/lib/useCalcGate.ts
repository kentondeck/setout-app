import { useCallback } from 'react';
import { useSubscription } from './SubscriptionContext';

// Free-tier gate: one calculation per day per device. Pro users always pass.
//
// Storage shape: { date: 'YYYY-MM-DD', used: number } under a single key.
// Each new UTC-based day resets `used` to 0. `tryUse` returns true if the
// user is allowed to run this calc + records the usage; returns false if the
// gate is closed (caller should trigger the paywall).
//
// The counter is device-local (localStorage), so a savvy user can clear it
// to reset. For a $1.99/wk builder tool, that's an acceptable trade — the
// alternative (server-backed device fingerprinting) is a much bigger build
// and doesn't fit "internal only" architecture.

const GATE_KEY = 'sitehand_calc_gate';
const FREE_CALCS_PER_DAY = 1;

interface GateState {
  date: string;
  used: number;
}

function todayKey(): string {
  const d = new Date();
  // Local-date key so a user's "one per day" resets at their midnight, not UTC.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readGate(): GateState {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return { date: '', used: 0 };
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<GateState>;
      return { date: typeof p.date === 'string' ? p.date : '', used: typeof p.used === 'number' ? p.used : 0 };
    }
    return { date: '', used: 0 };
  } catch {
    return { date: '', used: 0 };
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
  // Attempt to consume one free calculation. Returns true when allowed
  // (either Pro, or a fresh day, or under the daily quota) and records
  // the usage against today. Returns false when the daily quota is used
  // up — caller should call subscription.showPaywall().
  tryUse: () => boolean;
  // Peek without consuming — for UI hints (e.g. "1 free calc left today").
  remainingToday: () => number;
}

export function useCalcGate(): CalcGate {
  const { isPro } = useSubscription();

  const tryUse = useCallback((): boolean => {
    if (isPro) return true;
    const today = todayKey();
    const state = readGate();
    if (state.date !== today) {
      writeGate({ date: today, used: 1 });
      return true;
    }
    if (state.used < FREE_CALCS_PER_DAY) {
      writeGate({ date: today, used: state.used + 1 });
      return true;
    }
    return false;
  }, [isPro]);

  const remainingToday = useCallback((): number => {
    if (isPro) return Infinity;
    const today = todayKey();
    const state = readGate();
    if (state.date !== today) return FREE_CALCS_PER_DAY;
    return Math.max(0, FREE_CALCS_PER_DAY - state.used);
  }, [isPro]);

  return { tryUse, remainingToday };
}
