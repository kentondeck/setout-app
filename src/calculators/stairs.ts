import type { WorkingStep } from '../components/ApprenticeWorking';

export interface StairLimitsInput {
  riserMin: number;
  riserMax: number;
  treadMin: number;
  treadMax: number;
}

export interface StairsInputs {
  totalRise: number;        // mm
  totalRun: number;         // mm (available horizontal space)
  preferredRiser: number;   // mm
  limits?: StairLimitsInput;
}

export interface StairsOutputs extends Record<string, number> {
  riserCount: number;
  treadCount: number;
  riserHeight: number;    // mm (actual, rounded)
  treadDepth: number;     // mm
  stringerLength: number; // mm
  stringerAngle: number;  // degrees
}

export interface StairsWarnings {
  riserOutOfRange: boolean;
  treadOutOfRange: boolean;
}

export interface StairsResult {
  outputs: StairsOutputs;
  warnings: StairsWarnings;
  steps: WorkingStep[];
}

const AU_LIMITS: StairLimitsInput = { riserMin: 115, riserMax: 225, treadMin: 240, treadMax: 355 };

export function calculateStairs(inputs: StairsInputs): StairsResult {
  const { totalRise, totalRun, preferredRiser, limits = AU_LIMITS } = inputs;

  // Number of risers: round to nearest whole number using preferred riser height
  const riserCount = Math.round(totalRise / preferredRiser);
  const riserHeight = parseFloat((totalRise / riserCount).toFixed(1));

  // Treads = risers - 1 (top tread is the landing)
  const treadCount = riserCount - 1;
  const treadDepth = parseFloat((totalRun / treadCount).toFixed(1));

  // Stringer length via Pythagoras
  const stringerLength = parseFloat(
    Math.sqrt(Math.pow(totalRise, 2) + Math.pow(totalRun, 2)).toFixed(0)
  );

  // Stringer angle from horizontal in degrees
  const stringerAngle = parseFloat(
    ((Math.atan2(totalRise, totalRun) * 180) / Math.PI).toFixed(1)
  );

  const riserOutOfRange = riserHeight < limits.riserMin || riserHeight > limits.riserMax;
  const treadOutOfRange = treadDepth < limits.treadMin || treadDepth > limits.treadMax;

  const steps: WorkingStep[] = [
    {
      label: 'Riser count',
      formula: 'round( total rise ÷ preferred riser height )',
      result: `round( ${totalRise}mm ÷ ${preferredRiser}mm ) = ${riserCount} risers`,
    },
    {
      label: 'Actual riser height',
      formula: 'total rise ÷ riser count',
      result: `${totalRise}mm ÷ ${riserCount} = ${riserHeight}mm per riser`,
    },
    {
      label: 'Tread count & depth',
      formula: 'treads = risers − 1 ; tread depth = total run ÷ tread count',
      result: `${riserCount} − 1 = ${treadCount} treads ; ${totalRun}mm ÷ ${treadCount} = ${treadDepth}mm per tread`,
    },
    {
      label: 'Stringer length',
      formula: '√( rise² + run² )',
      result: `√( ${totalRise}² + ${totalRun}² ) = ${stringerLength}mm`,
    },
    {
      label: 'Stringer angle',
      formula: 'arctan( total rise ÷ total run )',
      result: `arctan( ${totalRise} ÷ ${totalRun} ) = ${stringerAngle}°`,
    },
  ];

  return {
    outputs: { riserCount, treadCount, riserHeight, treadDepth, stringerLength, stringerAngle },
    warnings: { riserOutOfRange, treadOutOfRange },
    steps,
  };
}
