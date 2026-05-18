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
  stringerLength: number; // mm — line length (hypotenuse). Add 50–100mm for top/bottom cuts when ordering stock.
  stringerAngle: number;  // degrees
  walklineSum: number;    // mm — 2 × riser + going (Blondel ergonomic check)
}

export interface StairsWarnings {
  riserOutOfRange: boolean;
  treadOutOfRange: boolean;
  walklineOutOfRange: boolean; // 2R + G not in 550–700mm
  angleOutOfRange: boolean;    // stringer angle < 20° or > 45°
  suggestedMinRun?: number;    // mm — min run for a compliant going
  suggestedMaxRun?: number;    // mm — max run for a compliant going
  runDerived: boolean;         // true when totalRun was calculated from preferredGoing
}

// Blondel rule: 2 risers + 1 going should fall in this range for comfortable steps.
const WALKLINE_MIN = 550;
const WALKLINE_MAX = 700;
// Stringer angle bounds — outside this range warrants a warning.
const ANGLE_MIN = 20;
const ANGLE_MAX = 45;

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

  // At least 2 risers needed — 1 riser means 0 treads (division by zero)
  if (riserCount < 2) {
    riserCount = 2;
    if (runDerived && preferredGoing) totalRun = preferredGoing;
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

  const walklineSum = parseFloat((2 * riserHeight + treadDepth).toFixed(1));

  const riserOutOfRange = riserHeight < limits.riserMin || riserHeight > limits.riserMax;
  const treadOutOfRange = treadDepth < limits.treadMin || treadDepth > limits.treadMax;
  const walklineOutOfRange = walklineSum < WALKLINE_MIN || walklineSum > WALKLINE_MAX;
  const angleOutOfRange = stringerAngle < ANGLE_MIN || stringerAngle > ANGLE_MAX;

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
    outputs: { riserCount, treadCount, riserHeight, treadDepth, stringerLength, stringerAngle, walklineSum },
    warnings: { riserOutOfRange, treadOutOfRange, walklineOutOfRange, angleOutOfRange, suggestedMinRun, suggestedMaxRun, runDerived },
    steps,
  };
}
