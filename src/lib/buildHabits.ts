// Per-device memory of how a tradie deviates from the AI's default takeoff — e.g. always removing
// an item it adds (protective tape), or always adding one it misses. A single edit could just be
// one-off for that job, so a pattern only counts as a genuine habit once it's shown up a few times;
// then it's fed back into future takeoffs (via api/quote.ts) as a personal preference on top of the
// region's standard material conventions.
import { fuzzyMaterialKey } from './priceMemory';

const HABITS_KEY = 'setout_photoquote_build_habits_v1';
const LEARN_THRESHOLD = 3;

interface RemovedEntry {
  itemLabel: string;
  count: number;
}

interface AddedEntry {
  itemLabel: string;
  unit: string;
  note: string;
  count: number;
}

interface HabitsStore {
  removed: Record<string, RemovedEntry>;
  added: Record<string, AddedEntry>;
}

function readStore(): HabitsStore {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return { removed: {}, added: {} };
    const parsed = JSON.parse(raw) as Partial<HabitsStore>;
    return { removed: parsed.removed ?? {}, added: parsed.added ?? {} };
  } catch {
    return { removed: {}, added: {} };
  }
}

function writeStore(store: HabitsStore) {
  localStorage.setItem(HABITS_KEY, JSON.stringify(store));
}

export function recordMaterialRemoved(item: string) {
  if (!item.trim()) return;
  const store = readStore();
  const key = fuzzyMaterialKey(item);
  const existing = store.removed[key];
  store.removed[key] = { itemLabel: item.trim(), count: (existing?.count ?? 0) + 1 };
  writeStore(store);
}

export function recordMaterialAdded(item: string, unit: string, note: string) {
  if (!item.trim()) return;
  const store = readStore();
  const key = fuzzyMaterialKey(item);
  const existing = store.added[key];
  store.added[key] = { itemLabel: item.trim(), unit: unit.trim() || 'each', note: note.trim(), count: (existing?.count ?? 0) + 1 };
  writeStore(store);
}

export interface LearnedPreferences {
  alwaysOmit: string[];
  alwaysAdd: { item: string; unit: string; note: string }[];
}

// Only a pattern seen at least LEARN_THRESHOLD times counts as a real habit rather than a one-off
// edit specific to a single job.
export function getLearnedPreferences(): LearnedPreferences {
  const store = readStore();
  return {
    alwaysOmit: Object.values(store.removed).filter(e => e.count >= LEARN_THRESHOLD).map(e => e.itemLabel),
    alwaysAdd: Object.values(store.added).filter(e => e.count >= LEARN_THRESHOLD).map(e => ({ item: e.itemLabel, unit: e.unit, note: e.note })),
  };
}
