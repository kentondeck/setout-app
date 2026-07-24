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
// Firing every chunk at once causes real contention against the API (observed: 3 of 5 fully
// concurrent chunks stalled past 2 minutes instead of finishing faster) — likely account-level
// rate limits on concurrent requests. Cap how many chunks run at once instead.
const MAX_CONCURRENT_CHUNKS = 2;

// The model is asked to echo the item name back verbatim but sometimes appends the "(per unit)"
// hint from the request — strip any trailing parenthetical before matching.
export function normalizeItemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
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
