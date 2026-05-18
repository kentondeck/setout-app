import type { HistoryEntry, MaterialRates } from '../types';

export function estimateEntryCost(entry: HistoryEntry, rates: MaterialRates): number | null {
  const o = entry.outputs;
  switch (entry.calculatorId) {
    case 'decking': {
      if (!rates.timberPerLm) return null;
      return Number(o.totalLinealMetres) * rates.timberPerLm;
    }
    case 'framing':
    case 'raked': {
      if (!rates.timberPerLm) return null;
      return Number(o.totalLinealMetres) * rates.timberPerLm;
    }
    case 'cladding': {
      if (!rates.timberPerLm) return null;
      return Number(o.totalLm) * rates.timberPerLm;
    }
    case 'concrete': {
      const useBagMix = Number(o.useBagMix) === 1;
      if (useBagMix) {
        if (!rates.concreteBagEach) return null;
        return Number(o.bagCount) * rates.concreteBagEach;
      }
      if (!rates.concretePerM3) return null;
      return Number(o.orderVolume) * rates.concretePerM3;
    }
    case 'roofing': {
      if (!rates.roofingSheetEach) return null;
      return Number(o.sheetCount) * rates.roofingSheetEach;
    }
    default:
      return null;
  }
}

export function formatCost(amount: number): string {
  return `$${amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
