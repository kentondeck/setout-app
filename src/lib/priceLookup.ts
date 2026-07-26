// Shared-cache price lookup helper — checks the shared Redis cache (every Setout user, populated
// by the admin seed script and by tradies confirming prices) for materials a quote doesn't already
// have a remembered price for. Deliberately does NOT fall back to a live AI web search from here —
// that was slow (up to 300s) and cost real Anthropic credits on every quote a tradie generated.
// Anything not in the cache is left for the tradie to type in manually.
import type { Region } from '../types';
import { rememberMaterialPrice, fuzzyMaterialKey } from './priceMemory';

export interface PriceLookupItem {
  item: string;
  unit: string;
}

export interface PricedMaterial {
  item: string;
  price: number;
  source?: string;
}

// The model is asked to echo the item name back verbatim but sometimes appends the "(per unit)"
// hint from the request — strip any trailing parenthetical before matching.
export function normalizeItemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
}

const LOW_VALUE_KEYWORDS = [
  'screw', 'nail', 'bolt', 'bracket', 'hanger', 'sealant', 'silicone', 'foam',
  'packer', 'shim', 'adhesive', 'tape', 'paint', 'primer', 'stain',
];

// Fixings and consumables are cheap and low-variance — a rough book estimate is fine to show
// immediately rather than waiting on a cache check. Structural/higher-value materials need a real
// known price (remembered or shared cache) or the tradie enters it themselves.
export function isCheapFixing(item: string): boolean {
  const s = item.toLowerCase();
  return LOW_VALUE_KEYWORDS.some(k => s.includes(k));
}

interface SharedCacheEntry {
  price: number;
  source?: string;
}

async function checkSharedCache(keys: string[], region: Region): Promise<Record<string, SharedCacheEntry>> {
  if (keys.length === 0) return {};
  try {
    const res = await fetch(`/api/price-cache?region=${region}&keys=${encodeURIComponent(keys.join(','))}`);
    if (!res.ok) return {};
    const { results } = (await res.json()) as { results: Record<string, SharedCacheEntry> };
    return results;
  } catch {
    return {};
  }
}

// Checks the shared cache for the given items and remembers any hits locally so they're instant
// next time too. Anything not found is simply omitted from the result — no live search, no cost.
export async function lookupCachedPrices(items: PriceLookupItem[], region: Region): Promise<PricedMaterial[]> {
  if (items.length === 0) return [];

  const keyed = items.map(i => ({ ...i, key: fuzzyMaterialKey(i.item) }));
  const cacheHits = await checkSharedCache(keyed.map(k => k.key), region);

  const found: PricedMaterial[] = [];
  for (const k of keyed) {
    const hit = cacheHits[k.key];
    if (hit) {
      found.push({ item: k.item, price: hit.price, source: hit.source });
      rememberMaterialPrice(k.item, region, String(hit.price), hit.source);
    }
  }
  return found;
}
