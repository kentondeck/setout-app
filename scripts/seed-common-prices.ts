// Admin-only maintenance script — NOT part of the deployed app, no end user ever sees or triggers
// this. Seeds the shared Redis price cache (api/price-cache.ts) with real, web-search-confirmed
// prices for Setout's common-materials list, so those items are already priced the first time
// they show up in anyone's quote instead of triggering an individual live search.
//
// Costs real Anthropic API credits for every item that needs a live search (fixings/consumables
// are priced from the static book instead, for free) — run deliberately, not casually.
//
// Usage:
//   npx tsx scripts/seed-common-prices.ts           # seeds AU and NZ
//   npx tsx scripts/seed-common-prices.ts AU        # AU only
//   npx tsx scripts/seed-common-prices.ts NZ        # NZ only

import { COMMON_MATERIALS } from '../src/lib/commonMaterials';
import { needsLiveSearch } from '../src/lib/priceLookup';
import { fuzzyMaterialKey } from '../src/lib/priceMemory';
import { lookupMaterialPrice } from '../src/lib/materialPricing';

const BASE_URL = 'https://setout-app.vercel.app';
const CHUNK_SIZE = 3;

type Region = 'AU' | 'NZ';

async function writeToCache(region: Region, entries: { key: string; price: number; source?: string }[]) {
  if (entries.length === 0) return;
  const res = await fetch(`${BASE_URL}/api/price-cache`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ region, entries }),
  });
  if (!res.ok) console.error(`  ! cache write failed: ${res.status} ${await res.text()}`);
}

async function seedRegion(region: Region) {
  console.log(`\n=== Seeding ${region} ===`);

  const bookItems = COMMON_MATERIALS.filter(m => !needsLiveSearch(m.item));
  const searchItems = COMMON_MATERIALS.filter(m => needsLiveSearch(m.item));

  console.log(`${bookItems.length} fixings/consumables — pricing from the static book (free)`);
  const bookEntries = bookItems
    .map(m => ({ key: fuzzyMaterialKey(m.item), price: parseFloat(lookupMaterialPrice(m.item, region)) }))
    .filter(e => e.price > 0);
  await writeToCache(region, bookEntries);
  console.log(`  wrote ${bookEntries.length} entries`);

  console.log(`${searchItems.length} structural/higher-value items — live web search (costs credits)`);
  let searched = 0;
  for (let i = 0; i < searchItems.length; i += CHUNK_SIZE) {
    const chunk = searchItems.slice(i, i + CHUNK_SIZE);
    process.stdout.write(`  chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(searchItems.length / CHUNK_SIZE)} (${chunk.map(c => c.item).join(', ')})... `);
    try {
      const res = await fetch(`${BASE_URL}/api/price-lookup`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: chunk, region }),
      });
      if (!res.ok) {
        console.log(`FAILED (${res.status}) ${await res.text()}`);
        continue;
      }
      const { materials } = (await res.json()) as { materials: { item: string; price: number; source?: string }[] };
      await writeToCache(region, materials.map(m => ({ key: fuzzyMaterialKey(m.item), price: m.price, source: m.source })));
      searched += materials.length;
      console.log(`priced ${materials.length}/${chunk.length}`);
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`${region} done: ${bookEntries.length} from book + ${searched} from search = ${bookEntries.length + searched}/${COMMON_MATERIALS.length} total`);
}

async function main() {
  const arg = process.argv[2]?.toUpperCase();
  const regions: Region[] = arg === 'AU' || arg === 'NZ' ? [arg] : ['AU', 'NZ'];
  for (const region of regions) await seedRegion(region);
}

main();
