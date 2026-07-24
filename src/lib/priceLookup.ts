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

// The model is asked to echo the item name back verbatim but sometimes appends the "(per unit)"
// hint from the request — strip any trailing parenthetical before matching.
export function normalizeItemKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim();
}

// Looks up real prices for the given items via web search, in small parallel chunks rather than
// one big sequential call (which scales wait time linearly with item count). Remembers every
// result found and calls onChunkResult as each chunk resolves, so callers can update UI
// progressively instead of waiting for the whole list to finish.
export async function lookupPrices(
  items: PriceLookupItem[],
  region: Region,
  onChunkResult?: (priced: PricedMaterial[]) => void,
): Promise<void> {
  if (items.length === 0) return;
  const chunks: PriceLookupItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));

  await Promise.allSettled(chunks.map(async chunk => {
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
  }));
}
