import type { WorkingStep } from '../components/ApprenticeWorking';

export interface RakedWallInputs {
  wallLength: number;   // metres
  lowHeight: number;    // mm — height at short end
  highHeight: number;   // mm — height at tall end (derived from pitch if needed)
  studSpacing: number;  // mm
}

export interface RakedWallOutputs extends Record<string, number> {
  studCount: number;
  lowStudHeight: number;   // mm
  highStudHeight: number;  // mm (last stud position, may differ from highHeight)
  rakePlateLength: number; // mm
  bottomPlateLineal: number; // m
  totalStudLineal: number; // lm
  pitchAngle: number;      // degrees
}

export interface RakedWallResult {
  outputs: RakedWallOutputs;
  studHeights: number[];   // mm height for each stud in order from low to high end
  steps: WorkingStep[];
}

export function calculateRakedWall(inputs: RakedWallInputs): RakedWallResult {
  const { wallLength, lowHeight, highHeight, studSpacing } = inputs;

  const wallLengthMm = wallLength * 1000;
  const rise = highHeight - lowHeight;

  const studCount = Math.floor(wallLengthMm / studSpacing) + 1;

  // Interpolate each stud height along the rake line
  const studHeights: number[] = [];
  for (let i = 0; i < studCount; i++) {
    const position = i * studSpacing;
    studHeights.push(Math.round(lowHeight + (rise * position) / wallLengthMm));
  }

  const lowStudHeight = studHeights[0];
  const highStudHeight = studHeights[studCount - 1];

  // Rake plate spans the full horizontal length at the pitch angle
  const rakePlateLength = Math.round(Math.sqrt(wallLengthMm ** 2 + rise ** 2));

  const bottomPlateLineal = parseFloat(wallLength.toFixed(2));

  const totalStudLineal = parseFloat(
    (studHeights.reduce((s, h) => s + h, 0) / 1000).toFixed(2)
  );

  const pitchAngle = parseFloat(
    ((Math.atan2(rise, wallLengthMm) * 180) / Math.PI).toFixed(1)
  );

  const steps: WorkingStep[] = [
    {
      label: 'Total rise',
      formula: 'high end height − low end height',
      result: `${highHeight}mm − ${lowHeight}mm = ${rise}mm rise`,
    },
    {
      label: 'Pitch angle',
      formula: 'arctan( rise ÷ wall length )',
      result: `arctan( ${rise} ÷ ${wallLengthMm} ) = ${pitchAngle}°`,
    },
    {
      label: 'Stud count',
      formula: 'floor( wall length (mm) ÷ stud spacing ) + 1',
      result: `floor( ${wallLengthMm} ÷ ${studSpacing} ) + 1 = ${studCount} studs`,
    },
    {
      label: 'Stud heights',
      formula: 'low height + ( rise × position ÷ wall length )',
      result: `${lowStudHeight}mm → ${highStudHeight}mm, each cut to ${pitchAngle}° at top`,
    },
    {
      label: 'Rake plate length',
      formula: '√( wall length² + rise² )',
      result: `√( ${wallLengthMm}² + ${rise}² ) = ${rakePlateLength}mm`,
    },
  ];

  return {
    outputs: { studCount, lowStudHeight, highStudHeight, rakePlateLength, bottomPlateLineal, totalStudLineal, pitchAngle },
    studHeights,
    steps,
  };
}
