// Shared web-search price lookup helper — used both for filling in a single quote's missing
// materials and for bulk pre-seeding the price memory with common materials ahead of time.
import type { Region } from '../types';
import { rememberMaterialPrice } from './priceMemory';

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
    onChunkResult?.(priced);
  } catch { /* this chunk's items stay unpriced — caller decides fallback */ }
}

// Looks up real prices for the given items via web search, in small chunks with bounded
// concurrency rather than one big sequential call (which scales wait time linearly with item
// count) or firing everything at once (which causes API contention — see MAX_CONCURRENT_CHUNKS).
// Remembers every result found and calls onChunkResult as each chunk resolves, so callers can
// update UI progressively instead of waiting for the whole list to finish.
export async function lookupPrices(
  items: PriceLookupItem[],
  region: Region,
  onChunkResult?: (priced: PricedMaterial[]) => void,
): Promise<void> {
  if (items.length === 0) return;
  const chunks: PriceLookupItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));

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
