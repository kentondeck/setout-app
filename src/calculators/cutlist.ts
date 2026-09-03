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

// A kerf is lost between pieces, not before the first one — n pieces cut from
// one stock length need n-1 kerfs, not n. Reserving a kerf for the first
// piece in a fresh bin can push a job onto an extra stock length it doesn't
// actually need (e.g. 3×1198mm fits exactly in one 3600mm board: 3×1198 +
// 2×3mm kerf = 3600mm).
function packBin(cuts: number[], stockLen: number): number[] {
  const packed: number[] = [];
  let used = 0;
  for (const cut of cuts) {
    const needed = packed.length === 0 ? cut : cut + KERF;
    if (used + needed <= stockLen) {
      packed.push(cut);
      used += needed;
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
      remaining.push(stockLen - cut);
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

    // Open a new bin: pick the length that packs the most cuts from todo.
    // Tie-break: shorter length (less waste).
    let bestLen = -1;
    let bestPacked: number[] = [];

    for (const stockLen of lengths) {
      if (stockLen < cut) continue;
      const packed = packBin(todo, stockLen);
      if (
        bestLen === -1 ||
        packed.length > bestPacked.length ||
        (packed.length === bestPacked.length && stockLen < bestLen)
      ) {
        bestLen = stockLen;
        bestPacked = packed;
      }
    }

    const newBin = { stockLength: bestLen, cuts: bestPacked, remaining: bestLen };
    bestPacked.forEach((c, i) => {
      newBin.remaining -= i === 0 ? c : c + KERF;
      const idx = todo.indexOf(c);
      if (idx >= 0) todo.splice(idx, 1);
    });
    bins.push(newBin);
  }

  return bins.map(b => ({ stockLength: b.stockLength, cuts: b.cuts }));
}

export function calculateCutlist(inputs: CutlistInputs): CutlistResult {
  const { cuts, stockLength, forcedStockLength, millAllowance = 0 } = inputs;
  const forced = forcedStockLength ?? stockLength;
  const baseLengths = forced ? [forced] : DEFAULT_STOCK_LENGTHS;
  // Effective lengths: millAllowance accounts for timber arriving slightly over nominal.
  // Used for fitting capacity only — plan and materialList display nominal lengths.
  const lengths = baseLengths.map(l => l + millAllowance);

  const allCuts: number[] = [];
  for (const { length, qty } of cuts) {
    for (let i = 0; i < qty; i++) allCuts.push(length);
  }
  allCuts.sort((a, b) => b - a);

  // A cut longer than the largest available stock can never be packed. Without
  // this guard, mixedBFD would never empty its todo list and loop forever.
  const maxStockLen = lengths.length ? Math.max(...lengths) : 0;
  if (allCuts.length > 0 && allCuts[0] > maxStockLen) {
    throw new Error(
      `Cut ${allCuts[0]}mm is longer than the longest stock length (${maxStockLen - millAllowance}mm).`
    );
  }

  let winnerBins: { stockLength: number; cuts: number[] }[] = [];
  let winnerCount = Infinity;
  let winnerTotal = Infinity;

  for (const stockLen of lengths) {
    if (stockLen < allCuts[0]) continue;
    const singleBins = bfdSingle(allCuts, stockLen).map(c => ({ stockLength: stockLen, cuts: c }));
    const count = singleBins.length;
    const total = count * stockLen;
    if (count < winnerCount || (count === winnerCount && total < winnerTotal)) {
      winnerCount = count;
      winnerTotal = total;
      winnerBins = singleBins;
    }
  }

  if (lengths.length > 1) {
    const mixed = mixedBFD(allCuts, lengths);
    const mixedCount = mixed.length;
    const mixedTotal = mixed.reduce((s, b) => s + b.stockLength, 0);
    if (mixedCount < winnerCount || (mixedCount === winnerCount && mixedTotal < winnerTotal)) {
      winnerCount = mixedCount;
      winnerTotal = mixedTotal;
      winnerBins = mixed;
    }
  }

  // Convert effective stock lengths back to nominal (subtract millAllowance) for display
  const plan: CutlistPlan[] = winnerBins.map((bin, i) => {
    const nominalStock = bin.stockLength - millAllowance;
    const used = bin.cuts.reduce((s, l, i) => s + l + (i === 0 ? 0 : KERF), 0);
    return {
      stockIndex: i + 1,
      stockLength: nominalStock,
      cuts: bin.cuts.map(l => ({ length: l, qty: 1 })),
      waste: bin.stockLength - used,
    };
  });

  const countMap = new Map<number, number>();
  for (const bin of winnerBins) {
    const nominalStock = bin.stockLength - millAllowance;
    countMap.set(nominalStock, (countMap.get(nominalStock) ?? 0) + 1);
  }
  const materialList: MaterialItem[] = [...countMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([stockLength, count]) => ({ stockLength, count }));

  const totalPieces = winnerBins.length;
  const totalCutLength = allCuts.reduce((s, l) => s + l, 0);
  const totalWaste = plan.reduce((s, p) => s + p.waste, 0);
  const totalStock = winnerBins.reduce((s, b) => s + (b.stockLength - millAllowance), 0);
  const wastePercent = parseFloat(((totalWaste / totalStock) * 100).toFixed(1));
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
  ];

  return {
    outputs: { totalPieces, totalWaste, wastePercent, totalCutLength },
    plan,
    materialList,
    steps,
  };
}
