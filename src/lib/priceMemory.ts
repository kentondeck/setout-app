// Per-device memory of prices the tradie has confirmed or corrected in Photo Quote —
// checked before the static price book so a material/role only ever needs pricing once
// (either by AI web-search lookup or by hand) before it's remembered for every future quote.
import type { Region } from '../types';

// v3: bumped for fuzzyMaterialKey — v2 keyed on the exact item string, so two AI-generated quotes
// phrasing the same material differently ("140x45 H3 treated pine (joists)" vs "H3 treated pine
// joist 140x45mm") missed each other and both re-triggered a search. Fuzzy keys fix that; old
// exact-string entries under v2 would never match the new scheme anyway, so they're abandoned.
const MATERIAL_KEY = 'setout_photoquote_material_memory_v3';
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

const DIMENSION_RE = /\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?/g;
const SIZE_RE = /\b\d+(?:\.\d+)?\s*(?:kg|mm|m|l|litre)\b/g;

// Material identity signals: species/grade, treatment, and shape/function. Order-independent and
// wording-tolerant on purpose — "140x45 H3 treated pine (joists)" and "H3 treated pine joist
// 140x45mm" must resolve to the same key even though an AI-generated quote will phrase either way.
const IDENTITY_KEYWORDS = [
  'treated pine', 'structural pine', 'hardwood', 'h3', 'h4', 'h5', 'mgp10', 'mgp12', 'msg8', 'msg10', 'msg12', 'lvl',
  'joist', 'bearer', 'post', 'paling', 'rail', 'decking board', 'weatherboard', 'architrave', 'reveal', 'jamb',
  'fibre cement', 'colorbond', 'coloursteel', 'guttering', 'gutter', 'plasterboard', 'gib',
  'insulation', 'batts', 'flashing', 'membrane', 'waterproofing', 'paint', 'primer', 'stain',
  'screw', 'nail', 'bolt', 'bracket', 'hanger', 'sealant', 'silicone', 'foam', 'packer', 'shim',
  'concrete', 'premix', 'gravel', 'aggregate', 'sand',
];

/** Wording-tolerant identity key for a material name — same size + type resolves to the same key
 * regardless of phrasing order or exact words used around it. Falls back to a cleaned-up version
 * of the raw string when nothing recognisable is found, so unmatched items still get a stable key. */
export function fuzzyMaterialKey(item: string): string {
  const s = item.toLowerCase();
  const dims = (s.match(DIMENSION_RE) ?? []).map(d => d.replace(/\s+/g, ''));
  const sizes = (s.match(SIZE_RE) ?? []).map(d => d.replace(/\s+/g, ''));
  const keywords = IDENTITY_KEYWORDS.filter(k => s.includes(k));
  const parts = [...new Set([...dims, ...sizes, ...keywords])].sort();
  return parts.length > 0 ? parts.join('|') : s.replace(/[^a-z0-9]+/g, ' ').trim();
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
  const entry = readStore(MATERIAL_KEY)[`${region}:${fuzzyMaterialKey(item)}`];
  return entry?.price ?? '';
}

export function getRememberedMaterialSource(item: string, region: Region): string {
  if (!item.trim()) return '';
  const entry = readStore(MATERIAL_KEY)[`${region}:${fuzzyMaterialKey(item)}`];
  return entry?.source ?? '';
}

export function rememberMaterialPrice(item: string, region: Region, price: string, source?: string) {
  if (!item.trim() || !price.trim()) return;
  writeEntry(MATERIAL_KEY, `${region}:${fuzzyMaterialKey(item)}`, price, source);
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
