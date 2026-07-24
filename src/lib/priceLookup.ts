// Shared web-search price lookup helper — used both for filling in a single quote's missing
// materials and for bulk pre-seeding the price memory with common materials ahead of time.
//
// Lookup order: local device memory (checked by the caller before this runs) -> shared cache
// (every Setout user, via Redis) -> live web search, written back to the shared cache so the next
// person anywhere who needs this material gets it free and instant instead of searching again.
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

const CHUNK_SIZE = 3;
// Testing showed real contention on this account when firing multiple chunks concurrently — even
// 2 at once stalled past 180s in one test (5 at once: 3 of 5 stalled past 2 minutes). Couldn't
// fully isolate whether that was genuine rate-limit contention or leftover load from a prior test
// still running server-side (functions here have up to 300s to finish) without spending more API
// budget on further test cycles. Running sequentially is the safe default until that's confirmed —
// still simpler per-call than the original one-giant-batch bug, just without a parallelism claim
// that testing couldn't actually validate as safe.
const MAX_CONCURRENT_CHUNKS = 1;

// The model is asked to echo the item name back verbatim but sometimes appends the "(per unit)"
// hint from the request — strip any trailing parenthetical before matching.
export function normalizeItemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
}

const LOW_VALUE_KEYWORDS = [
  'screw', 'nail', 'bolt', 'bracket', 'hanger', 'sealant', 'silicone', 'foam',
  'packer', 'shim', 'adhesive', 'tape', 'paint', 'primer', 'stain',
];

// Fixings and consumables are cheap and low-variance — being a bit off on a box of screws barely
// moves the total, so it's not worth a live web search's time or cost. Only structural/higher-
// value materials (timber, sheet goods, concrete...) go through search; these use the price book
// directly instead.
export function needsLiveSearch(item: string): boolean {
  const s = item.toLowerCase();
  return !LOW_VALUE_KEYWORDS.some(k => s.includes(k));
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

function writeSharedCache(entries: { key: string; price: number; source?: string }[], region: Region): void {
  if (entries.length === 0) return;
  fetch('/api/price-cache', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region, entries }),
  }).catch(() => { /* best-effort — a failed write just means the next person searches again */ });
}

async function lookupChunk(
  chunk: PriceLookupItem[],
  region: Region,
  onChunkResult?: (priced: PricedMaterial[]) => void,
): Promise<void> {
  try {
    const res = await fetch('/api/price-lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: chunk, region }),
    });
    if (!res.ok) return;
    const { materials: priced } = (await res.json()) as { materials: PricedMaterial[] };
    for (const p of priced) rememberMaterialPrice(p.item, region, String(p.price), p.source);
    writeSharedCache(priced.map(p => ({ key: fuzzyMaterialKey(p.item), price: p.price, source: p.source })), region);
    onChunkResult?.(priced);
  } catch { /* this chunk's items stay unpriced — caller decides fallback */ }
}

// Looks up real prices for the given items: shared cache first (instant, free, benefits every
// Setout user), then live web search in small sequential chunks for whatever's still missing.
// Remembers every result found (locally and in the shared cache) and calls onChunkResult as
// results land, so callers can update UI progressively instead of waiting for everything to finish.
export async function lookupPrices(
  items: PriceLookupItem[],
  region: Region,
  onChunkResult?: (priced: PricedMaterial[]) => void,
): Promise<void> {
  if (items.length === 0) return;

  const keyed = items.map(i => ({ ...i, key: fuzzyMaterialKey(i.item) }));
  const cacheHits = await checkSharedCache(keyed.map(k => k.key), region);
  const stillMissing: PriceLookupItem[] = [];
  const fromCache: PricedMaterial[] = [];
  for (const k of keyed) {
    const hit = cacheHits[k.key];
    if (hit) {
      fromCache.push({ item: k.item, price: hit.price, source: hit.source });
      rememberMaterialPrice(k.item, region, String(hit.price), hit.source);
    } else {
      stillMissing.push(k);
    }
  }
  if (fromCache.length > 0) onChunkResult?.(fromCache);
  if (stillMissing.length === 0) return;

  const chunks: PriceLookupItem[][] = [];
  for (let i = 0; i < stillMissing.length; i += CHUNK_SIZE) chunks.push(stillMissing.slice(i, i + CHUNK_SIZE));

  let next = 0;
  async function worker(): Promise<void> {
    while (next < chunks.length) {
      const chunk = chunks[next++];
      await lookupChunk(chunk, region, onChunkResult);
    }
  }
  const workerCount = Math.min(MAX_CONCURRENT_CHUNKS, chunks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
