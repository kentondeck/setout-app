// Manually maintained reference pricing for Quote. The AI only returns materials/labour
// (no prices) — prices are looked up from this file so pricing doesn't cost API tokens.
// Update the figures below monthly against current trade/merchant pricing. Unmatched items are
// left blank for the tradie to fill in.
export const PRICE_BOOK_UPDATED = '2026-07-22';

export type Region = 'AU' | 'NZ';

interface MaterialPriceEntry {
  match: string[]; // lowercase keywords — any substring match counts as a hit
  unit: string;     // reference unit these prices are quoted per
  priceAUD: number;
  priceNZD: number;
}

interface LabourRateEntry {
  match: string[];
  rateAUD: number;
  rateNZD: number;
}

// Order matters: .find() below returns the FIRST match, so shaped/functional components (joist,
// decking board, paling...) must be checked before the generic timber-species entries at the
// bottom — otherwise an item like "125x125 H4 treated pine post" matches "treated pine" (a
// per-lineal-metre board rate) before it ever reaches the per-each post rate.
const MATERIAL_PRICES: MaterialPriceEntry[] = [
  // Structural/shaped timber components
  { match: ['joist', 'bearer'], unit: 'lm', priceAUD: 10, priceNZD: 11 },
  { match: ['decking board', 'composite decking'], unit: 'lm', priceAUD: 14, priceNZD: 15 },
  { match: ['paling', 'fence paling'], unit: 'each', priceAUD: 1.70, priceNZD: 1.90 },
  { match: ['rail', 'fence rail'], unit: 'lm', priceAUD: 5, priceNZD: 5.5 },
  { match: ['weatherboard', 'cladding board'], unit: 'lm', priceAUD: 12, priceNZD: 13 },
  { match: ['architrave'], unit: 'lm', priceAUD: 6, priceNZD: 6.5 },
  { match: ['reveal', 'jamb liner', 'jamb'], unit: 'lm', priceAUD: 12, priceNZD: 13 },
  // Slab reinforcement
  { match: ['reinforcing mesh', 'mesh sheet', 'sl62', 'sl72', 'sl82', 'sl92'], unit: 'sheet', priceAUD: 95, priceNZD: 100 },
  { match: ['bar chair', 'mesh chair'], unit: 'pack', priceAUD: 18, priceNZD: 20 },
  { match: ['dpm', 'damp-proof', 'damp proof', 'builders plastic', "builder's plastic", 'vapour barrier'], unit: 'm2', priceAUD: 2, priceNZD: 2.2 },
  { match: ['tie wire', 'reo tie', 'rebar tie'], unit: 'roll', priceAUD: 15, priceNZD: 16 },
  { match: ['join tape', 'dpm tape', 'jointing tape'], unit: 'roll', priceAUD: 22, priceNZD: 24 },
  // Sheet/roll goods
  { match: ['fibre cement', 'fc sheet', 'compressed sheet'], unit: 'sheet', priceAUD: 65, priceNZD: 70 },
  { match: ['colorbond', 'roofing sheet', 'roof sheet'], unit: 'lm', priceAUD: 22, priceNZD: 24 },
  { match: ['guttering', 'gutter'], unit: 'lm', priceAUD: 18, priceNZD: 19 },
  { match: ['plasterboard', 'gib board', 'gib'], unit: 'sheet', priceAUD: 28, priceNZD: 30 },
  { match: ['sill tape', 'flashing tape'], unit: 'roll', priceAUD: 35, priceNZD: 38 },
  { match: ['flashing'], unit: 'lm', priceAUD: 10, priceNZD: 11 },
  // Fixings and consumables
  { match: ['screw', 'coach screw', 'batten screw'], unit: 'box', priceAUD: 18, priceNZD: 20 },
  { match: ['nail', 'gun nail'], unit: 'box', priceAUD: 15, priceNZD: 16 },
  { match: ['bolt', 'coach bolt', 'joist hanger', 'bracket', 'fixing'], unit: 'each', priceAUD: 4, priceNZD: 4.5 },
  { match: ['insulation', 'batts'], unit: 'm2', priceAUD: 8, priceNZD: 9 },
  { match: ['membrane', 'waterproofing'], unit: 'm2', priceAUD: 14, priceNZD: 15 },
  { match: ['paint', 'primer', 'stain'], unit: 'litre', priceAUD: 16, priceNZD: 17 },
  { match: ['expanding foam', 'foam sealant'], unit: 'each', priceAUD: 13, priceNZD: 14 },
  { match: ['silicone', 'sealant', 'no more gaps', 'no-more-gaps'], unit: 'each', priceAUD: 11, priceNZD: 12 },
  { match: ['packer', 'shim'], unit: 'pack', priceAUD: 8, priceNZD: 9 },
  // Concrete and aggregate
  { match: ['concrete premix', 'premix bag', '20kg bag', 'concrete bag'], unit: 'bag', priceAUD: 9, priceNZD: 10 },
  { match: ['cement'], unit: 'bag', priceAUD: 12, priceNZD: 13 },
  { match: ['ready mix concrete', 'concrete m3', 'concrete m³'], unit: 'm3', priceAUD: 250, priceNZD: 260 },
  { match: ['gravel', 'aggregate', 'blue metal', 'road base'], unit: 'm3', priceAUD: 65, priceNZD: 70 },
  { match: ['sand'], unit: 'm3', priceAUD: 55, priceNZD: 60 },
  // Generic timber species — catch-all fallback for boards not covered by a shape above
  { match: ['hardwood'], unit: 'lm', priceAUD: 16, priceNZD: 17 },
  { match: ['structural pine', 'framing timber', 'mgp10', 'mgp12'], unit: 'lm', priceAUD: 7, priceNZD: 8 },
  { match: ['treated pine', 'h3 pine', 'h4 pine', 'h5 pine'], unit: 'lm', priceAUD: 9, priceNZD: 10 },
];

// Posts are priced by cross-section, not matched against the generic table above — a 125x125/150x150
// structural post costs meaningfully more than a standard 90x90/100x100 fence/deck post.
const POST_PRICE: Record<'standard' | 'large', { AUD: number; NZD: number }> = {
  standard: { AUD: 35, NZD: 38 }, // 90x90 / 100x100
  large: { AUD: 85, NZD: 90 },    // 125x125 / 150x150
};

const LABOUR_RATES: LabourRateEntry[] = [
  { match: ['apprentice'], rateAUD: 38, rateNZD: 40 },
  { match: ['labourer', 'laborer'], rateAUD: 48, rateNZD: 50 },
  { match: ['carpenter'], rateAUD: 68, rateNZD: 70 },
  { match: ['builder', 'foreman', 'supervisor'], rateAUD: 78, rateNZD: 80 },
  { match: ['electrician'], rateAUD: 90, rateNZD: 92 },
  { match: ['plumber'], rateAUD: 90, rateNZD: 92 },
  { match: ['painter'], rateAUD: 58, rateNZD: 60 },
  { match: ['roofer'], rateAUD: 68, rateNZD: 70 },
  { match: ['concreter'], rateAUD: 65, rateNZD: 67 },
  { match: ['fencer'], rateAUD: 60, rateNZD: 62 },
  { match: ['tiler'], rateAUD: 65, rateNZD: 67 },
];

const DEFAULT_LABOUR_RATE_AUD = 60;
const DEFAULT_LABOUR_RATE_NZD = 62;

/** Returns a starting unit price for a material name, or '' if nothing in the price book matches. */
export function lookupMaterialPrice(itemName: string, region: Region): string {
  const s = itemName.toLowerCase();

  if (s.includes('post')) {
    const tier = s.includes('125') || s.includes('150') ? 'large' : 'standard';
    return String(region === 'AU' ? POST_PRICE[tier].AUD : POST_PRICE[tier].NZD);
  }

  const hit = MATERIAL_PRICES.find(entry => entry.match.some(k => s.includes(k)));
  if (!hit) return '';
  return String(region === 'AU' ? hit.priceAUD : hit.priceNZD);
}

/** Returns a starting hourly rate for a labour role — falls back to a generic trade rate. */
export function lookupLabourRate(role: string, region: Region): string {
  const s = role.toLowerCase();
  const hit = LABOUR_RATES.find(entry => entry.match.some(k => s.includes(k)));
  if (hit) return String(region === 'AU' ? hit.rateAUD : hit.rateNZD);
  return String(region === 'AU' ? DEFAULT_LABOUR_RATE_AUD : DEFAULT_LABOUR_RATE_NZD);
}
