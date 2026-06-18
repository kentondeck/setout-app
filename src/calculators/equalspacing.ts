import type { WorkingStep } from '../components/ApprenticeWorking';

export interface EqualSpacingInputs {
  totalSpan: number;          // mm
  itemWidth?: number;         // mm (optional, default 0 — point/centreline items)
  itemCount?: number;         // if provided, drives spacing
  preferredSpacing?: number;  // mm — if provided (and no itemCount), drives count
}

export interface EqualSpacingOutputs extends Record<string, number> {
  itemCount: number;
  gapCount: number;           // itemCount + 1
  actualGap: number;          // mm — clear space between each item and at each end
  centreSpacing: number;      // mm — centre-to-centre (= actualGap when itemWidth = 0)
}

export interface EqualSpacingResult {
  outputs: EqualSpacingOutputs;
  steps: WorkingStep[];
  countDerived: boolean;      // true when itemCount was calculated from preferredSpacing
}

export function calculateEqualSpacing(inputs: EqualSpacingInputs): EqualSpacingResult {
  const { totalSpan, itemWidth = 0, itemCount: inputCount, preferredSpacing } = inputs;

  let itemCount: number;
  let countDerived = false;

  if (inputCount != null && inputCount > 0) {
    itemCount = inputCount;
  } else if (preferredSpacing != null && preferredSpacing > 0) {
    // N(gap + width) = span − gap  →  N = (span − gap) / (gap + width)
    const rawN = (totalSpan - preferredSpacing) / (preferredSpacing + itemWidth);
    itemCount = Math.max(1, Math.round(rawN));
    countDerived = true;
  } else {
    itemCount = 1;
  }

  const gapCount = itemCount + 1;
  const actualGap = parseFloat(((totalSpan - itemCount * itemWidth) / gapCount).toFixed(1));
  const centreSpacing = parseFloat((actualGap + itemWidth).toFixed(1));

  const rawN = preferredSpacing && itemWidth >= 0
    ? (totalSpan - preferredSpacing) / (preferredSpacing + itemWidth)
    : 0;

  const steps: WorkingStep[] = [
    ...(countDerived && preferredSpacing ? [{
      label: 'Item count from preferred spacing',
      formula: itemWidth > 0
        ? 'round( (span − preferred gap) ÷ (preferred gap + item width) )'
        : 'round( span ÷ preferred spacing ) − 1',
      result: `round( ${rawN.toFixed(2)} ) = ${itemCount} items`,
    }] : []),
    {
      label: itemWidth > 0 ? 'Actual gap (edge to edge)' : 'Actual spacing',
      formula: itemWidth > 0
        ? '(span − items × item width) ÷ (items + 1)'
        : 'span ÷ (items + 1)',
      result: itemWidth > 0
        ? `(${totalSpan} − ${itemCount} × ${itemWidth}) ÷ ${gapCount} = ${actualGap}mm`
        : `${totalSpan} ÷ ${gapCount} = ${actualGap}mm`,
    },
    ...(itemWidth > 0 ? [{
      label: 'Centre-to-centre spacing',
      formula: 'actual gap + item width',
      result: `${actualGap}mm + ${itemWidth}mm = ${centreSpacing}mm`,
    }] : []),
    {
      label: 'First mark from end',
      formula: itemWidth > 0 ? 'gap + item width ÷ 2' : 'spacing',
      result: itemWidth > 0
        ? `${actualGap}mm + ${itemWidth / 2}mm = ${parseFloat((actualGap + itemWidth / 2).toFixed(1))}mm from end`
        : `${actualGap}mm from end`,
    },
  ];

  return {
    outputs: { itemCount, gapCount, actualGap, centreSpacing },
    steps,
    countDerived,
  };
}
