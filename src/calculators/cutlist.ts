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
    for (let i = 0; i < qty; i++) allCuts.pus
