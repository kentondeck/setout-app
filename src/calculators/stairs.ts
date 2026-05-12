import type { WorkingStep } from '../components/ApprenticeWorking';

export interface StairLimitsInput {
  riserMin: number;
  riserMax: number;
  treadMin: number;
  treadMax: number;
}

export interface StairsInputs {
  totalRise: number;        // mm
  totalRun?: number;        // mm — optional; derived from preferredGoing if omitted
  preferredRiser: number;   // mm
  preferredGoing?: number;  // mm (optional — drives tread count when provided)
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
  suggestedMinRun?: number; // mm — min run for a compliant going
  suggestedMaxRun?: number; // mm — max run for a compliant going
  runDerived: boolean;      // true when totalRun was calculated from preferredGoing
}

export interface StairsResult {
  outputs: StairsOutputs;
  warnings: StairsWarnings;
  steps: WorkingStep[];
}

const AU_LIMITS: StairLimitsInput = { riserMin: 115, riserMax: 225, treadMin: 240, treadMax: 355 };

export function calculateStairs(inputs: StairsInputs): StairsResult {
  const { totalRise, totalRun: inputRun, preferredRiser, preferredGoing, limits = AU_LIMITS } = inputs;

  const riserCountFromRiser = Math.round(totalRise / preferredRiser);
  let riserCount: number;
  let totalRun: number;
  let runDerived = false;

  if (!inputRun && preferredGoing) {
    // No run provided — derive it from preferred going
    riserCount = riserCountFromRiser;
    totalRun = (riserCount - 1) * preferredGoing;
    runDerived = true;
  } else {
    totalRun = inputRun!;
    const riserCountFromGoing = preferredGoing
      ? Math.round(totalRun / preferredGoing) + 1
      : null;

    if (riserCountFromGoing !== null && riserCountFromGoing !== riserCountFromRiser) {
      const riserA = totalRise / riserCountFromRiser;
      const treadA = totalRun / (riserCountFromRiser - 1);
      const riserB = totalRise / riserCountFromGoing;
      const treadB = totalRun / (riserCountFromGoing - 1);
      const aCompliant =
        riserA >= limits.riserMin && riserA <= limits.riserMax &&
        treadA >= limits.treadMin && treadA <= limits.treadMax;
      const bCompliant =
        riserB >= limits.riserMin && riserB <= limits.riserMax &&
        treadB >= limits.treadMin && treadB <= limits.treadMax;
      riserCount = (bCompliant || !aCompliant) ? riserCountFromGoing : riserCountFromRiser;
    } else {
      riserCount = riserCountFromGoing ?? riserCountFromRiser;
    }
  }

  const riserHeight = parseFloat((totalRise / riserCount).toFixed(1));
  const treadCount = riserCount - 1;
  const treadDepth = parseFloat((totalRun / treadCount).toFixed(1));

  const stringerLength = parseFloat(
    Math.sqrt(Math.pow(totalRise, 2) + Math.pow(totalRun, 2)).toFixed(0)
  );
  const stringerAngle = parseFloat(
    ((Math.atan2(totalRise, totalRun) * 180) / Math.PI).toFixed(1)
  );

  const riserOutOfRange = riserHeight < limits.riserMin || riserHeight > limits.riserMax;
  const treadOutOfRange = treadDepth < limits.treadMin || treadDepth > limits.treadMax;

  // If going is out of range, suggest what total run would fix it
  const suggestedMinRun = treadOutOfRange ? Math.round(treadCount * limits.treadMin) : undefined;
  const suggestedMaxRun = treadOutOfRange ? Math.round(treadCount * limits.treadMax) : undefined;

  const drivenByGoing = !runDerived && preferredGoing != null &&
    Math.round(totalRun / preferredGoing) + 1 === riserCount;

  const steps: WorkingStep[] = [
    {
      label: 'Riser count',
      formula: drivenByGoing
        ? 'round( total run ÷ preferred going ) + 1'
        : 'round( total rise ÷ preferred riser height )',
      result: drivenByGoing
        ? `round( ${totalRun}mm ÷ ${preferredGoing}mm ) + 1 = ${riserCount} risers`
        : `round( ${totalRise}mm ÷ ${preferredRiser}mm ) = ${riserCount} risers`,
    },
    {
      label: 'Actual riser height',
      formula: 'total rise ÷ riser count',
      result: `${totalRise}mm ÷ ${riserCount} = ${riserHeight}mm per riser`,
    },
    {
      label: 'Tread count & depth',
      formula: runDerived
        ? 'treads = risers − 1 ; total run = treads × preferred going'
        : 'treads = risers − 1 ; tread depth = total run ÷ tread count',
      result: runDerived
        ? `${riserCount} − 1 = ${treadCount} treads ; ${treadCount} × ${preferredGoing}mm = ${totalRun}mm run`
        : `${riserCount} − 1 = ${treadCount} treads ; ${totalRun}mm ÷ ${treadCount} = ${treadDepth}mm per tread`,
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
    warnings: { riserOutOfRange, treadOutOfRange, suggestedMinRun, suggestedMaxRun, runDerived },
    steps,
  };
}
