import type { WorkingStep } from '../components/ApprenticeWorking';

export interface RoofInputs {
  buildingWidth: number;  // metres (full width — run = half this)
  pitchDegrees: number;   // degrees
  overhang: number;       // metres (eaves overhang each side)
}

export interface RoofOutputs extends Record<string, number> {
  run: number;              // metres (half building width)
  ridgeHeight: number;      // metres
  rafterLength: number;     // metres (excluding overhang)
  totalRafterLength: number;// metres (with overhang)
  plumbCutAngle: number;    // degrees (at ridge)
  seatCutAngle: number;     // degrees (at wall plate)
}

export interface RoofResult {
  outputs: RoofOutputs;
  steps: WorkingStep[];
}

export function calculateRoof(inputs: RoofInputs): RoofResult {
  const { buildingWidth, pitchDegrees, overhang } = inputs;

  const run = parseFloat((buildingWidth / 2).toFixed(3));
  const pitchRad = (pitchDegrees * Math.PI) / 180;

  // Ridge height from wall plate
  const ridgeHeight = parseFloat((run * Math.tan(pitchRad)).toFixed(3));

  // Rafter length (horizontal run to ridge via hypotenuse)
  const rafterLength = parseFloat((run / Math.cos(pitchRad)).toFixed(3));

  // Total rafter including overhang
  const overhangRafter = parseFloat((overhang / Math.cos(pitchRad)).toFixed(3));
  const totalRafterLength = parseFloat((rafterLength + overhangRafter).toFixed(3));

  // Plumb cut at ridge = pitch angle (cut perpendicular to rafter slope)
  const plumbCutAngle = parseFloat(pitchDegrees.toFixed(1));

  // Seat cut (bird's mouth) at wall plate = 90 - pitch
  const seatCutAngle = parseFloat((90 - pitchDegrees).toFixed(1));

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
  ];

  return {
    outputs: { run, ridgeHeight, rafterLength, totalRafterLength, plumbCutAngle, seatCutAngle },
    steps,
  };
}
