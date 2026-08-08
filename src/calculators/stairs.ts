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
  preferredRiser?: number;  // mm — optional; auto-derived from limits midpoint when omitted
  preferredGoing?: number;  // mm (optional — drives tread count when provided)
  nosing?: number;          // mm — optional; tread overhang past the riser face below it
  treadThickness?: number;  // mm — optional; used only to work out the bottom stringer drop
  limits?: StairLimitsInput;
}

export interface StairsOutputs extends Record<string, number> {
  riserCount: number;
  treadCount: number;
  riserHeight: number;      // mm (actual, rounded)
  treadDepth: number;       // mm — the going (nosing-to-nosing), used for the walkline/compliance check
  treadBoardDepth: number;  // mm — treadDepth + nosing: the actual board depth to cut/order, front to back
  stringerLength: number;   // mm — theoretical pitch-line length (hypotenuse), plus the extra run needed to
                             // accommodate the bottom drop when treadThickness is set. Add 50–100mm on top
                             // when ordering stock, to allow for the actual top/bottom end cuts.
  stringerAngle: number;    // degrees
  walklineSum: number;      // mm — 2 × riser + going (Blondel ergonomic check)
  stringerDrop: number;     // mm — treadThickness: how much to drop the bottom stringer cut so the first step matches the rest
}

export interface StairsWarnings {
  riserOutOfRange: boolean;
  treadOutOfRange: boolean;
  walklineOutOfRange: boolean; // 2R + G not in 550–700mm
  angleOutOfRange: boolean;    // stringer angle < 20° or > 45°
  suggestedMinRun?: number;    // mm — min run for a compliant going
  suggestedMaxRun?: number;    // mm — max run for a compliant going
  runDerived: boolean;         // true when totalRun was calculated from preferredGoing
  riserAutoSelected: boolean;  // true when preferredRiser was not provided
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
  const { totalRise, totalRun: inputRun, preferredGoing, limits = AU_LIMITS } = inputs;
  const preferredRiser = inputs.preferredRiser ?? (limits.riserMin + limits.riserMax) / 2;
  const riserAutoSelected = inputs.preferredRiser == null;

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
  const nosing = inputs.nosing ?? 0;
  // The going (treadDepth) is measured nosing-to-nosing, but the tread board itself has to run
  // past the riser face below it by the nosing overhang to actually form that nosing.
  const treadBoardDepth = parseFloat((treadDepth + nosing).toFixed(1));
  // Every tread board sits on top of its stringer notch, raising that tread's surface by the
  // board's thickness — except the bottom one, which has no board below it. Dropping the bottom
  // of the stringer by that same thickness keeps the first step's rise equal to all the others.
  const stringerDrop = inputs.treadThickness ?? 0;

  const stringerAngleRad = Math.atan2(totalRise, totalRun);
  const stringerAngle = parseFloat(((stringerAngleRad * 180) / Math.PI).toFixed(1));

  const pitchLineLength = Math.sqrt(Math.pow(totalRise, 2) + Math.pow(totalRun, 2));
  // Dropping the stringer's foot by stringerDrop (vertically) while keeping the same cutting
  // angle extends the raw board along its own slope by stringerDrop ÷ sin(angle) — not by
  // stringerDrop itself, since that extension runs at the pitch angle, not straight down.
  const stringerDropExtra = stringerDrop > 0 ? stringerDrop / Math.sin(stringerAngleRad) : 0;
  const stringerLength = parseFloat((pitchLineLength + stringerDropExtra).toFixed(0));

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
        : riserAutoSelected
          ? `round( total rise ÷ midpoint of limits [${limits.riserMin}–${limits.riserMax}mm] )`
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
    ...(nosing > 0 ? [{
      label: 'Tread board depth',
      formula: 'going + nosing overhang',
      result: `${treadDepth}mm + ${nosing}mm = ${treadBoardDepth}mm — the actual board depth to cut/order`,
    }] : []),
    ...(stringerDrop > 0 ? [{
      label: 'Stringer drop (bottom cut)',
      formula: 'tread board thickness',
      result: `Drop the bottom of the stringer by ${stringerDrop}mm so the first riser matches the rest once the tread board is fixed on`,
    }] : []),
    {
      label: 'Stringer length',
      formula: stringerDropExtra > 0
        ? '√( rise² + run² ) + drop ÷ sin( angle )'
        : '√( rise² + run² )',
      result: stringerDropExtra > 0
        ? `√( ${totalRise}² + ${totalRun}² ) + ${stringerDrop}mm ÷ sin(${stringerAngle}°) = ${Math.round(pitchLineLength)}mm + ${stringerDropExtra.toFixed(0)}mm = ${stringerLength}mm`
        : `√( ${totalRise}² + ${totalRun}² ) = ${stringerLength}mm`,
    },
    {
      label: 'Ordering stock',
      formula: 'stringer length + 50–100mm allowance',
      result: `Order ${stringerLength}mm + 50–100mm to allow for the top and bottom end cuts`,
    },
    {
      label: 'Stringer angle',
      formula: 'arctan( total rise ÷ total run )',
      result: `arctan( ${totalRise} ÷ ${totalRun} ) = ${stringerAngle}°`,
    },
  ];

  return {
    outputs: { riserCount, treadCount, riserHeight, treadDepth, treadBoardDepth, stringerLength, stringerAngle, walklineSum, stringerDrop },
    warnings: { riserOutOfRange, treadOutOfRange, walklineOutOfRange, angleOutOfRange, suggestedMinRun, suggestedMaxRun, runDerived, riserAutoSelected },
    steps,
  };
}
