import type { WorkingStep } from '../components/ApprenticeWorking';

export interface RoofInputs {
  buildingWidth: number;   // metres (full width — run = half this)
  pitchDegrees: number;    // degrees
  overhang: number;        // metres (eaves overhang each side)
  rafterDepth?: number;    // mm — optional, for birdsmouth depth check
  plateWidth?: number;     // mm — optional, for birdsmouth geometry
  ridgeThickness?: number; // mm — optional, for ridge shortening
}

export interface RoofOutputs extends Record<string, number> {
  run: number;                  // metres (half building width)
  ridgeHeight: number;          // metres
  rafterLength: number;         // metres (excluding overhang, to ridge centreline)
  totalRafterLength: number;    // metres (with overhang)
  plumbCutAngle: number;        // degrees (at ridge)
  seatCutAngle: number;         // degrees (at wall plate)
  birdsmouthPlumbDepth: number; // mm — vertical cut depth of birdsmouth (0 if not calculated)
  remainingDepth: number;       // mm — rafter depth minus birdsmouth plumb depth (0 if not calculated)
  ridgeShortening: number;      // mm along rafter — deduct from line length (0 if not calculated)
  netRafterLengthMm: number;    // mm — seat plumb to ridge face (0 if ridge thickness not provided)
}

export interface RoofResult {
  outputs: RoofOutputs;
  steps: WorkingStep[];
}

export function calculateRoof(inputs: RoofInputs): RoofResult {
  const { buildingWidth, pitchDegrees, overhang, rafterDepth, plateWidth, ridgeThickness } = inputs;

  const run = parseFloat((buildingWidth / 2).toFixed(3));
  const pitchRad = (pitchDegrees * Math.PI) / 180;

  const ridgeHeight = parseFloat((run * Math.tan(pitchRad)).toFixed(3));
  const rafterLength = parseFloat((run / Math.cos(pitchRad)).toFixed(3));

  const overhangRafter = parseFloat((overhang / Math.cos(pitchRad)).toFixed(3));
  const totalRafterLength = parseFloat((rafterLength + overhangRafter).toFixed(3));

  const plumbCutAngle = pitchDegrees;
  const seatCutAngle = 90 - pitchDegrees;

  // Rafter cut details — only when optional inputs are provided
  let birdsmouthPlumbDepth = 0;
  let remainingDepth = 0;
  let ridgeShortening = 0;
  let netRafterLengthMm = 0;

  if (plateWidth && plateWidth > 0) {
    birdsmouthPlumbDepth = Math.round(plateWidth * Math.tan(pitchRad));
    if (rafterDepth && rafterDepth > 0) {
      remainingDepth = rafterDepth - birdsmouthPlumbDepth;
    }
  }

  if (ridgeThickness && ridgeThickness > 0) {
    ridgeShortening = Math.round((ridgeThickness / 2) / Math.cos(pitchRad));
    netRafterLengthMm = Math.round(run * 1000) - ridgeShortening;
  }

  const steps: WorkingStep[] = [
    {
      label: 'Run (half span)',
      formula: 'building width ÷ 2',
      result: `${buildingWidth}m ÷ 2 = ${run}m`,
    },
    {
      label: 'Ridge height',
      formula: 'run × tan( pitch )',
      result: `${run}m × tan(${pitchDegrees}°) = ${ridgeHeight}m`,
    },
    {
      label: 'Rafter length',
      formula: 'run ÷ cos( pitch )',
      result: `${run}m ÷ cos(${pitchDegrees}°) = ${rafterLength}m`,
    },
    {
      label: 'Total rafter with overhang',
      formula: 'rafter + overhang ÷ cos( pitch )',
      result: `${rafterLength}m + (${overhang}m ÷ cos(${pitchDegrees}°)) = ${totalRafterLength}m`,
    },
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
    ...(ridgeThickness && ridgeThickness > 0 ? [{
      label: 'Ridge shortening',
      formula: '(ridge thickness ÷ 2) ÷ cos( pitch )',
      result: `(${ridgeThickness}mm ÷ 2) ÷ cos(${pitchDegrees}°) = ${ridgeShortening}mm`,
    }] : []),
  ];

  return {
    outputs: {
      run, ridgeHeight, rafterLength, totalRafterLength,
      plumbCutAngle, seatCutAngle,
      birdsmouthPlumbDepth, remainingDepth, ridgeShortening, netRafterLengthMm,
    },
    steps,
  };
}
