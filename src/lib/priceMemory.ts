// Per-device memory of prices the tradie has confirmed or corrected in Photo Quote —
// checked before the static price book so a material/role only ever needs pricing once
// (either by AI web-search lookup or by hand) before it's remembered for every future quote.
import type { Region } from '../types';

// v2: bumped so devices that saved prices under the old (wrong) static-book-first logic don't
// keep reusing those stale/incorrect numbers forever now that web search is the real source.
const MATERIAL_KEY = 'setout_photoquote_material_memory_v2';
const LABOUR_KEY = 'setout_photoquote_labour_memory_v2';

interface MemoryEntry {
  price: string;
  source?: string; // e.g. a retailer name, when the price came from a web-search lookup
  updatedAt: number;
}

type MemoryStore = Record<string, MemoryEntry>;

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

function readStore(key: string): MemoryStore {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as MemoryStore) : {};
  } catch {
    return {};
  }
}

function writeEntry(key: string, storeKey: string, price: string, source?: string) {
  const store = readStore(key);
  store[storeKey] = { price, source, updatedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(store));
}

export function getRememberedMaterialPrice(item: string, region: Region): string {
  if (!item.trim()) return '';
  const entry = readStore(MATERIAL_KEY)[`${region}:${normalize(item)}`];
  return entry?.price ?? '';
}

export function getRememberedMaterialSource(item: string, region: Region): string {
  if (!item.trim()) return '';
  const entry = readStore(MATERIAL_KEY)[`${region}:${normalize(item)}`];
  return entry?.source ?? '';
}

export function rememberMaterialPrice(item: string, region: Region, price: string, source?: string) {
  if (!item.trim() || !price.trim()) return;
  writeEntry(MATERIAL_KEY, `${region}:${normalize(item)}`, price, source);
}

export function getRememberedLabourRate(role: string, region: Region): string {
  if (!role.trim()) return '';
  const entry = readStore(LABOUR_KEY)[`${region}:${normalize(role)}`];
  return entry?.price ?? '';
}

export function rememberLabourRate(role: string, region: Region, rate: string) {
  if (!role.trim() || !rate.trim()) return;
  writeEntry(LABOUR_KEY, `${region}:${normalize(role)}`, rate);
}
