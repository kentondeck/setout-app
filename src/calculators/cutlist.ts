import type { WorkingStep } from '../components/ApprenticeWorking';

export interface CutItem {
  length: number;
  qty: number;
}

export interface CutlistInputs {
  stockLength: number;
  cuts: CutItem[];
  pricePerMetre?: number;
}

export interface CutlistPlan {
  stockIndex: number;
  cuts: { length: number; qty: number }[];
  waste: number;
}

export interface CutlistOutputs extends Record<string, number> {
  stockCount: number;
  totalWaste: number;
  wastePercent: number;
  totalCost: number;
  totalCutLength: number;
}

export interface CutlistResult {
  outputs: CutlistOutputs;
  plan: CutlistPlan[];
  steps: WorkingStep[];
}

export function calculateCutlist(inputs: CutlistInputs): CutlistResult {
  const { stockLength, cuts, pricePerMetre = 0 } = inputs;
  const KERF = 3;

  const allCuts: number[] = [];
  for (const item of cuts) {
    for (let i = 0; i < item.qty; i++) {
      allCuts.push(item.length);
    }
  }
  allCuts.sort((a, b) => b - a);

  const bins: number[][] = [];

  for (const cut of allCuts) {
    let placed = false;
    for (const bin of bins) {
      const used = bin.reduce((s, l) => s + l + KERF, 0);
      if (used + cut + KERF <= stockLength) {
        bin.push(cut);
        placed = true;
        break;
      }
    }
    if (!placed) {
      bins.push([cut]);
    }
  }

  const plan: CutlistPlan[] = bins.map((bin, i) => {
    const used = bin.reduce((s, l) => s + l + KERF, 0);
    return {
      stockIndex: i + 1,
      cuts: bin.map(l => ({ length: l, qty: 1 })),
      waste: stockLength - used,
    };
  });

  const stockCount = bins.length;
  const totalCutLength = allCuts.reduce((s, l) => s + l, 0);
  const totalWaste = plan.reduce((s, p) => s + p.waste, 0);
  const totalStock = stockCount * stockLength;
  const wastePercent = parseFloat(((totalWaste / totalStock) * 100).toFixed(1));
  const totalCost =
    pricePerMetre > 0
      ? parseFloat(((stockCount * stockLength * pricePerMetre) / 1000).toFixed(2))
      : 0;

  const steps: WorkingStep[] = [
    {
      label: 'Cut pieces',
      formula: 'Total pieces to cut (all quantities expanded)',
      result: `${allCuts.length} pieces — longest ${allCuts[0]}mm, shortest ${allCuts[allCuts.length - 1]}mm`,
    },
    {
      label: 'Packing method',
      formula: 'First-fit decreasing (longest pieces placed first, 3mm kerf per cut)',
      result: `${allCuts.length} pieces packed into ${stockCount} × ${stockLength}mm lengths`,
    },
    {
      label: 'Waste',
      formula: '( total offcut waste ÷ total stock ) × 100',
      result: `${totalWaste}mm offcut from ${totalStock}mm stock = ${wastePercent}% waste`,
    },
    ...(pricePerMetre > 0
      ? [
          {
            label: 'Total cost',
            formula: 'stock count × stock length (m) × price per metre',
            result: `${stockCount} × ${(stockLength / 1000).toFixed(3)}m × $${pricePerMetre}/m = $${totalCost}`,
          },
        ]
      : []),
  ];

  return {
    outputs: { stockCount, totalWaste, wastePercent, totalCost, totalCutLength },
    plan,
    steps,
  };
}
