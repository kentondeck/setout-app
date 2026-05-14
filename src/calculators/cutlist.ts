import type { WorkingStep } from '../components/ApprenticeWorking';

export interface CutItem {
  length: number;  // mm
  qty: number;
}

export interface CutlistInputs {
  stockLength?: number;
  cuts: CutItem[];
  forcedStockLength?: number;
  millAllowance?: number;
  pricePerMetre?: number;
}

export interface MaterialItem {
  stockLength: number;
  count: number;
}

export interface CutlistPlan {
  stockIndex: number;
  stockLength: number;
  cuts: { length: number; qty: number }[];
  waste: number;
}

export interface CutlistOutputs extends Record<string, number> {
  totalPieces: number;
  totalWaste: number;
  wastePercent: number;
  totalCost: number;
  totalCutLength: number;
}

export interface CutlistResult {
  outputs: CutlistOutputs;
  plan: CutlistPlan[];
  materialList: MaterialItem[];
  steps: WorkingStep[];
}

export const DEFAULT_STOCK_LENGTHS = [2400, 3000, 3600, 4200, 4800, 5400, 6000];

const KERF = 3;

function minStock(cut: number, lengths: number[]): number {
  return lengths.find(l => l >= cut + KERF) ?? lengths[lengths.length - 1];
}

function packBin(cuts: number[], stockLen: number): number[] {
  const packed: number[] = [];
  let used = 0;
  for (const cut of cuts) {
    if (used + cut + KERF <= stockLen) {
      packed.push(cut);
      used += cut + KERF;
    }
  }
  return packed;
}

function bfdSingle(cuts: number[], stockLen: number): number[][] {
  const bins: number[][] = [];
  const remaining: number[] = [];
  for (const cut of cuts) {
    let bestIdx = -1;
    let bestRem = Infinity;
    for (let i = 0; i < bins.length; i++) {
      const r = remaining[i];
      if (r >= cut + KERF && r - (cut + KERF) < bestRem) {
        bestRem = r - (cut + KERF);
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      bins[bestIdx].push(cut);
      remaining[bestIdx] -= cut + KERF;
    } else {
      bins.push([cut]);
      remaining.push(stockLen - cut - KERF);
    }
  }
  return bins;
}

function mixedBFD(cuts: number[], lengths: number[]): { stockLength: number; cuts: number[] }[] {
  const bins: { stockLength: number; cuts: number[]; remaining: number }[] = [];
  const todo = [...cuts];

  while (todo.length > 0) {
    const cut = todo[0];

    let bestIdx = -1;
    let bestRem = Infinity;
    for (let i = 0; i < bins.length; i++) {
      const r = bins[i].remaining;
      if (r >= cut + KERF && r - (cut + KERF) < bestRem) {
        bestRem = r - (cut + KERF);
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      bins[bestIdx].cuts.push(cut);
      bins[bestIdx].remaining -= cut + KERF;
      todo.shift();
      continue;
    }

    let bestLen = -1;
    let bestScore = Infinity;
    let bestPacked: number[] = [];

    for (const stockLen of lengths) {
      if (stockLen < cut + KERF) continue;
      const packed = packBin(todo, stockLen);

      const leftover = [...todo];
      for (const c of packed) {
        const idx = leftover.indexOf(c);
        if (idx >= 0) leftover.splice(idx, 1);
      }

      const leftoverCost = leftover.reduce((s, c) => s + minStock(c, lengths), 0);
      const score = stockLen + leftoverCost;

      if (score < bestScore || (score === bestScore && packed.length > bestPacked.length)) {
        bestScore = score;
        bestLen = stockLen;
        bestPacked = packed;
      }
    }

    const newBin = { stockLength: bestLen, cuts: bestPacked, remaining: bestLen };
    for (const c of bestPacked) {
      newBin.remaining -= c + KERF;
      const idx = todo.indexOf(c);
      if (idx >= 0) todo.splice(idx, 1);
    }
    bins.push(newBin);
  }

  return bins.map(b => ({ stockLength: b.stockLength, cuts: b.cuts }));
}

export function calculateCutlist(inputs: CutlistInputs): CutlistResult {
  const { cuts, forcedStockLength, pricePerMetre = 0 } = inputs;
  const lengths = forcedStockLength ? [forcedStockLength] : DEFAULT_STOCK_LENGTHS;

  const allCuts: number[] = [];
  for (const { length, qty } of cuts) {
    for (let i = 0; i < qty; i++) allCuts.push(length);
  }
  allCuts.sort((a, b) => b - a);

  let winnerBins: { stockLength: number; cuts: number[] }[] = [];
  let winnerTotal = Infinity;

  for (const stockLen of lengths) {
    if (stockLen < allCuts[0] + KERF) continue;
    const singleBins = bfdSingle(allCuts, stockLen).map(c => ({ stockLength: stockLen, cuts: c }));
    const total = singleBins.length * stockLen;
    if (total < winnerTotal) {
      winnerTotal = total;
      winnerBins = singleBins;
    }
  }

  if (lengths.length > 1) {
    const mixed = mixedBFD(allCuts, lengths);
    const mixedTotal = mixed.reduce((s, b) => s + b.stockLength, 0);
    if (mixedTotal < winnerTotal) {
      winnerTotal = mixedTotal;
      winnerBins = mixed;
    }
  }

  const plan: CutlistPlan[] = winnerBins.map((bin, i) => {
    const used = bin.cuts.reduce((s, l) => s + l + KERF, 0);
    return {
      stockIndex: i + 1,
      stockLength: bin.stockLength,
      cuts: bin.cuts.map(l => ({ length: l, qty: 1 })),
      waste: bin.stockLength - used,
    };
  });

  const countMap = new Map<number, number>();
  for (const bin of winnerBins) {
    countMap.set(bin.stockLength, (countMap.get(bin.stockLength) ?? 0) + 1);
  }
  const materialList: MaterialItem[] = [...countMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([stockLength, count]) => ({ stockLength, count }));

  const totalPieces = winnerBins.length;
  const totalCutLength = allCuts.reduce((s, l) => s + l, 0);
  const totalWaste = plan.reduce((s, p) => s + p.waste, 0);
  const totalStock = winnerTotal;
  const wastePercent = parseFloat(((totalWaste / totalStock) * 100).toFixed(1));
  const totalCost =
    pricePerMetre > 0
      ? parseFloat(winnerBins.reduce((s, b) => s + (b.stockLength / 1000) * pricePerMetre, 0).toFixed(2))
      : 0;

  const orderSummary = materialList
    .map(m => `${m.count} × ${(m.stockLength / 1000).toFixed(1).replace(/\.0$/, '')}m`)
    .join(', ');

  const steps: WorkingStep[] = [
    {
      label: 'Cut pieces',
      formula: 'All cuts expanded and sorted longest-first',
      result: `${allCuts.length} pieces — longest ${allCuts[0]}mm, shortest ${allCuts[allCuts.length - 1]}mm`,
    },
    {
      label: 'Lengths considered',
      formula: forcedStockLength
        ? 'Fixed stock length (user specified)'
        : 'Standard NZ/AU lengths — picks the combination that minimises total timber purchased',
      result: lengths.map(l => `${(l / 1000).toFixed(1).replace(/\.0$/, '')}m`).join(', '),
    },
    {
      label: 'Optimised order',
      formula: 'Mixed best-fit decreasing vs single-length best-fit — lowest total stock wins',
      result: orderSummary,
    },
    {
      label: 'Waste',
      formula: '( total offcut ÷ total stock ) × 100',
      result: `${totalWaste}mm from ${totalStock}mm stock = ${wastePercent}% waste`,
    },
    ...(pricePerMetre > 0
      ? [{ label: 'Total cost', formula: 'each piece × its length (m) × price per metre', result: `$${totalCost}` }]
      : []),
  ];

  return {
    outputs: { totalPieces, totalWaste, wastePercent, totalCost, totalCutLength },
    plan,
    materialList,
    steps,
  };
}
