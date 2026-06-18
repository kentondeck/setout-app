import type { WorkingStep } from '../components/ApprenticeWorking';

// Any 2 of (span, rise, rafterLength, pitchDegrees) are required.
// The other 2 are derived. All lengths in metres, pitch in degrees.
export interface RoofInputs {
  span?: number;            // metres — full building width (= 2 × run) for gabled; direct run for skillion
  rise?: number;            // metres — vertical from wall plate to ridge
  rafterLength?: number;    // metres — to ridge centreline (no overhang)
  pitchDegrees?: number;    // degrees
  overhang: number;         // metres — eaves overhang each side
  rafterDepth?: number;     // mm — optional, for birdsmouth depth check
  plateWidth?: number;      // mm — optional, for birdsmouth geometry
  ridgeThickness?: number;  // mm — optional, for ridge shortening
  skillion?: boolean;       // true = single-side; span input treated as run directly (no ÷2)
}

export interface RoofOutputs extends Record<string, number> {
  span: number;                 // metres
  run: number;                  // metres (half span)
  rise: number;                 // metres (= ridgeHeight)
  ridgeHeight: number;          // metres (alias for rise — kept for backwards compat with diagram/etc.)
  rafterLength: number;         // metres — HEADLINE rafter (cut length if ridgeThickness provided, else line length)
  lineRafterLength: number;     // metres — always to ridge centreline (geometric)
  totalRafterLength: number;    // metres — rafterLength + overhang along rafter
  pitchDegrees: number;         // degrees
  plumbCutAngle: number;        // degrees (at ridge) = pitch
  seatCutAngle: number;         // degrees (at wall plate) = 90 − pitch
  birdsmouthPlumbDepth: number; // mm — 0 if not calculated
  remainingDepth: number;       // mm — 0 if not calculated
  ridgeShortening: number;      // mm along rafter — 0 if not calculated
  netRafterLengthMm: number;    // mm — seat plumb to ridge face — 0 if no ridge thickness
}

export interface RoofResult {
  outputs: RoofOutputs;
  steps: WorkingStep[];
  derivedKeys: Array<'span' | 'rise' | 'rafterLength' | 'pitchDegrees'>;
}

export class RoofInputError extends Error {}

const r3 = (n: number) => parseFloat(n.toFixed(3));
const r1 = (n: number) => parseFloat(n.toFixed(1));
const DEG = 180 / Math.PI;

// Returns true if a numeric input is "filled" (finite and positive).
function filled(v: number | undefined): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

// Solve the rafter triangle from any 2 of: span, rise, rafterLength, pitchDegrees.
// Gabled: run = span / 2. Skillion: run = span (entered directly, no halving).
//
// Branching collapses to two paths:
//   (a) pitch is known + one length     → single trig op per derived value
//   (b) pitch unknown + two lengths     → Pythagoras + one inverse trig
// Uses Math.hypot / Math.atan2 for numerical stability near the extremes.
function solveTriangle(args: {
  span?: number; rise?: number; rafterLength?: number; pitchDegrees?: number; skillion?: boolean;
}): { span: number; rise: number; rafterLength: number; pitchDegrees: number } {
  let { span, rise, rafterLength, pitchDegrees } = args;
  const skillion = args.skillion ?? false;
  let run = filled(span) ? (skillion ? span : span / 2) : undefined;

  const lengthsKnown = [run, rise, rafterLength].filter(filled).length;
  if (!filled(pitchDegrees) && lengthsKnown < 2) {
    throw new RoofInputError('Enter any 2 of span, rise, rafter length or pitch.');
  }

  // Path A — pitch + at least one length
  if (filled(pitchDegrees)) {
    if (pitchDegrees <= 0 || pitchDegrees >= 90) {
      throw new RoofInputError('Pitch must be between 1° and 89°.');
    }
    const rad = pitchDegrees * Math.PI / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const tan = sin / cos;
    if (filled(run))                  { rise = run * tan;          rafterLength = run / cos; }
    else if (filled(rise))            { run = rise / tan;          rafterLength = rise / sin; }
    else if (filled(rafterLength))    { run = rafterLength * cos;  rise = rafterLength * sin; }
    else throw new RoofInputError('Enter a length to pair with the pitch.');
  }
  // Path B — no pitch, two lengths
  else if (filled(run) && filled(rise)) {
    rafterLength = Math.hypot(run, rise);
    pitchDegrees = Math.atan2(rise, run) * DEG;
  } else if (filled(run) && filled(rafterLength)) {
    if (rafterLength <= run) throw new RoofInputError('Rafter length must exceed the run — check inputs.');
    rise = Math.sqrt(rafterLength * rafterLength - run * run);
    pitchDegrees = Math.atan2(rise, run) * DEG;
  } else if (filled(rise) && filled(rafterLength)) {
    if (rise >= rafterLength) throw new RoofInputError('Rise must be less than the rafter length — check inputs.');
    run = Math.sqrt(rafterLength * rafterLength - rise * rise);
    pitchDegrees = Math.atan2(rise, run) * DEG;
  }

  span = skillion ? (run as number) : (run as number) * 2;

  if (!filled(span) || !filled(rise) || !filled(rafterLength) || !filled(pitchDegrees)) {
    throw new RoofInputError('Could not solve roof geometry — check inputs.');
  }
  if (pitchDegrees <= 0 || pitchDegrees >= 90) {
    throw new RoofInputError('Pitch must be between 1° and 89°.');
  }
  return { span, rise, rafterLength, pitchDegrees };
}

export function calculateRoof(inputs: RoofInputs): RoofResult {
  const { overhang, rafterDepth, plateWidth, ridgeThickness, skillion } = inputs;

  const initiallyFilled = (['span', 'rise', 'rafterLength', 'pitchDegrees'] as const)
    .filter(k => filled(inputs[k]));

  // When ridge thickness is provided, the user's `rafterLength` input is the CUT length
  // (rafter to ridge face). The geometry solver works in LINE length (to centreline).
  // Iterate to back-compute: line = cut + (ridge/2) / cos(pitch).
  // Converges in 2–4 iterations because cos is smooth.
  let solverInputs = inputs;
  const ridgeHalfM = filled(ridgeThickness) ? (ridgeThickness / 1000) / 2 : 0;
  if (ridgeHalfM > 0 && filled(inputs.rafterLength)) {
    let lineGuess = inputs.rafterLength + ridgeHalfM;
    for (let i = 0; i < 12; i++) {
      const trial = solveTriangle({ ...inputs, rafterLength: lineGuess, skillion });
      const cosP = Math.cos(trial.pitchDegrees * Math.PI / 180);
      const next = inputs.rafterLength + ridgeHalfM / cosP;
      if (Math.abs(next - lineGuess) < 1e-6) { lineGuess = next; break; }
      lineGuess = next;
    }
    solverInputs = { ...inputs, rafterLength: lineGuess };
  }

  const solved = solveTriangle({ ...solverInputs, skillion });
  const span = r3(solved.span);
  const rise = r3(solved.rise);
  const lineRafterLength = r3(solved.rafterLength);
  const pitchDegrees = r1(solved.pitchDegrees);
  const run = r3(skillion ? span : span / 2);

  // Guard against mm-entered-as-m (e.g. span=5400 instead of 5.4)
  if (run > 200 || rise > 200 || lineRafterLength > 200) {
    throw new RoofInputError('Results exceed 200 m — enter lengths in metres (e.g. 5.4, not 5400).');
  }

  const pitchRad = pitchDegrees * Math.PI / 180;

  // Shortening + cut rafter (only meaningful when ridge given)
  const ridgeShorteningM = ridgeHalfM > 0 ? ridgeHalfM / Math.cos(pitchRad) : 0;
  const cutRafterLength = r3(lineRafterLength - ridgeShorteningM);

  // HEADLINE rafter is cut when ridge provided, line otherwise
  const rafterLength = ridgeHalfM > 0 ? cutRafterLength : lineRafterLength;

  const overhangRafter = overhang > 0 ? r3(overhang / Math.cos(pitchRad)) : 0;
  const totalRafterLength = r3(rafterLength + overhangRafter);

  const plumbCutAngle = pitchDegrees;
  const seatCutAngle = 90 - pitchDegrees;

  let birdsmouthPlumbDepth = 0;
  let remainingDepth = 0;

  if (plateWidth && plateWidth > 0) {
    birdsmouthPlumbDepth = parseFloat((plateWidth * Math.tan(pitchRad)).toFixed(1));
    if (rafterDepth && rafterDepth > 0) {
      remainingDepth = rafterDepth - birdsmouthPlumbDepth;
    }
  }
  const ridgeShortening = ridgeHalfM > 0 ? Math.round(ridgeShorteningM * 1000) : 0;
  const netRafterLengthMm = ridgeHalfM > 0 ? Math.round(cutRafterLength * 1000) : 0;

  const derivedKeys = (['span', 'rise', 'rafterLength', 'pitchDegrees'] as const)
    .filter(k => !initiallyFilled.includes(k));

  const steps: WorkingStep[] = [
    {
      label: 'Inputs given',
      formula: 'any 2 of: span, rise, rafter length, pitch',
      result: initiallyFilled.length === 0 ? '—' : initiallyFilled.join(', '),
    },
    {
      label: 'Pitch',
      formula: 'derived if not entered',
      result: `${pitchDegrees}°`,
    },
    {
      label: skillion ? 'Run' : 'Span / Run',
      formula: skillion ? 'run = input directly' : 'run = span ÷ 2',
      result: skillion ? `run ${run}m` : `span ${span}m → run ${run}m`,
    },
    {
      label: 'Rise (ridge height)',
      formula: 'run × tan( pitch )',
      result: `${run}m × tan(${pitchDegrees}°) = ${rise}m`,
    },
    {
      label: ridgeHalfM > 0 ? 'Rafter line length (centreline)' : 'Rafter length',
      formula: 'run ÷ cos( pitch )  (= √(run² + rise²))',
      result: `${lineRafterLength}m`,
    },
    ...(ridgeHalfM > 0 ? [{
      label: 'Cut rafter (to ridge face)',
      formula: 'line − (ridge ÷ 2) ÷ cos( pitch )',
      result: `${lineRafterLength}m − ${(ridgeShorteningM).toFixed(3)}m = ${cutRafterLength}m`,
    }] : []),
    ...(overhang > 0 ? [{
      label: 'Total rafter with overhang',
      formula: 'rafter + overhang ÷ cos( pitch )',
      result: `${rafterLength}m + ${overhangRafter}m = ${totalRafterLength}m`,
    }] : []),
    {
      label: 'Cut angles',
      formula: 'plumb cut = pitch ; seat cut = 90° − pitch',
      result: `Plumb cut ${plumbCutAngle}° | Seat cut ${seatCutAngle}°`,
    },
    ...(plateWidth && plateWidth > 0 ? [{
      label: 'Birdsmouth plumb depth',
      formula: 'plate width × tan( pitch )',
      result: `${plateWidth}mm × tan(${pitchDegrees}°) = ${birdsmouthPlumbDepth}mm`,
    }] : []),
    ...(ridgeHalfM > 0 ? [{
      label: 'Ridge shortening',
      formula: '(ridge thickness ÷ 2) ÷ cos( pitch )',
      result: `(${ridgeThickness}mm ÷ 2) ÷ cos(${pitchDegrees}°) = ${ridgeShortening}mm`,
    }] : []),
  ];

  return {
    outputs: {
      span, run, rise,
      ridgeHeight: rise,
      rafterLength, lineRafterLength, totalRafterLength,
      pitchDegrees, plumbCutAngle, seatCutAngle,
      birdsmouthPlumbDepth, remainingDepth, ridgeShortening, netRafterLengthMm,
    },
    steps,
    derivedKeys,
  };
}
