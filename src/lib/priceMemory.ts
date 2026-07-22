// Per-device memory of prices the tradie has confirmed or corrected in Photo Quote —
// checked before the static price book so a material/role only ever needs pricing once
// (either by AI lookup or by hand) before it's remembered for every future quote.
import type { Region } from '../types';

const MATERIAL_KEY = 'setout_photoquote_material_memory';
const LABOUR_KEY = 'setout_photoquote_labour_memory';

interface MemoryEntry {
  price: string;
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

function writeEntry(key: string, storeKey: string, price: string) {
  const store = readStore(key);
  store[storeKey] = { price, updatedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(store));
}

export function getRememberedMaterialPrice(item: string, region: Region): string {
  if (!item.trim()) return '';
  const entry = readStore(MATERIAL_KEY)[`${region}:${normalize(item)}`];
  return entry?.price ?? '';
}

export function rememberMaterialPrice(item: string, region: Region, price: string) {
  if (!item.trim() || !price.trim()) return;
  writeEntry(MATERIAL_KEY, `${region}:${normalize(item)}`, price);
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
