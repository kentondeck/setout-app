import type { WorkingStep } from '../components/ApprenticeWorking';
import { CalcInputError } from './errors';

export interface BalusterInputs {
  totalLength: number;    // mm (clear span between posts)
  balusterWidth: number;  // mm
  maxGap: number;         // mm (default 125mm AU/NZ)
}

export interface BalusterOutputs extends Record<string, number> {
  balusters: number;
  actualGap: number;      // mm (exact gap achieved)
  totalBalusterWidth: number; // mm
  totalLength: number;    // mm — echoed back so the diagram uses the value actually calculated, not a re-parsed live input
  balusterWidth: number;  // mm — echoed back for the same reason
}

export interface BalusterResult {
  outputs: BalusterOutputs;
  steps: WorkingStep[];
}

export function calculateBaluster(inputs: BalusterInputs): BalusterResult {
  const { totalLength, balusterWidth, maxGap } = inputs;

  // The span has to fit at least one baluster with a gap either side —
  // otherwise the calc produces 0 balusters and a nonsense "compliant" result.
  if (balusterWidth + 2 * 1 > totalLength) {
    throw new CalcInputError('Baluster width is larger than the span — nothing to fit.');
  }
  // A span less than one max-gap doesn't need balusters at all.
  if (totalLength <= maxGap) {
    throw new CalcInputError(`Span is smaller than the max gap (${maxGap} mm) — no balusters needed.`);
  }

  // n balusters create (n+1) gaps
  // Minimum n such that each gap ≤ maxGap:
  // (totalLength - n × balusterWidth) / (n + 1) ≤ maxGap
  // totalLength - n × balusterWidth ≤ maxGap × (n + 1)
  // totalLength - maxGap ≤ n × (balusterWidth + maxGap)
  // n ≥ (totalLength - maxGap) / (balusterWidth + maxGap)
  const balusters = Math.ceil(
    (totalLength - maxGap) / (balusterWidth + maxGap)
  );

  const totalBalusterWidth = balusters * balusterWidth;
  const remainingSpace = totalLength - totalBalusterWidth;
  const gaps = balusters + 1;
  const actualGap = parseFloat((remainingSpace / gaps).toFixed(1));

  const steps: WorkingStep[] = [
    {
      label: 'Minimum baluster count',
      formula: 'ceil( (total length − max gap) ÷ (baluster width + max gap) )',
      result: `ceil( (${totalLength} − ${maxGap}) ÷ (${balusterWidth} + ${maxGap}) ) = ceil( ${((totalLength - maxGap) / (balusterWidth + maxGap)).toFixed(2)} ) = ${balusters} balusters`,
    },
    {
      label: 'Actual gap',
      formula: '(total length − total baluster width) ÷ (balusters + 1)',
      result: `(${totalLength} − ${totalBalusterWidth}) ÷ ${gaps} = ${actualGap}mm per gap`,
    },
    {
      label: 'Compliance check',
      formula: `Gap must be ≤ ${maxGap}mm — check the applicable barrier standard for your region`,
      result: `${actualGap}mm ${actualGap <= maxGap ? '✓ within the entered limit' : '✗ exceeds the entered limit'}`,
    },
  ];

  return {
    outputs: { balusters, actualGap, totalBalusterWidth, totalLength, balusterWidth },
    steps,
  };
}
