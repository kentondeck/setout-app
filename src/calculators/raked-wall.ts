import type { WorkingStep } from '../components/ApprenticeWorking';

export interface RakedWallInputs {
  wallLength: number;   // mm — horizontal length of wall
  lowHeight: number;    // mm — height at short end
  highHeight: number;   // mm — height at tall end (derived from pitch if needed)
  studSpacing: number;  // mm
}

export interface RakedWallOutputs extends Record<string, number> {
  studCount: number;
  lowStudHeight: number;    // mm
  highStudHeight: number;   // mm (last stud position, may differ from highHeight)
  rakePlateLength: number;  // mm
  bottomPlateLineal: number; // lm
  totalStudLineal: number;  // lm — studs only
  totalLinealMetres: number; // lm — studs + rake plate + bottom plate
  pitchAngle: number;       // degrees
}

export interface RakedWallResult {
  outputs: RakedWallOutputs;
  studHeights: number[];   // mm height for each stud in order from low to high end
  steps: WorkingStep[];
}

export function calculateRakedWall(inputs: RakedWallInputs): RakedWallResult {
  const { wallLength, lowHeight, highHeight, studSpacing } = inputs;

  // wallLength is now in mm — no conversion needed
  const rise = highHeight - lowHeight;

  const studCount = Math.floor(wallLength / studSpacing) + 1;

  // Interpolate each stud height along the rake line
  const studHeights: number[] = [];
  for (let i = 0; i < studCount; i++) {
    const position = i * studSpacing;
    studHeights.push(Math.round(lowHeight + (rise * position) / wallLength));
  }

  const lowStudHeight = studHeights[0];
  const highStudHeight = studHeights[studCount - 1];

  // Rake plate = hypotenuse of the full wall
  const rakePlateLength = Math.round(Math.sqrt(wallLength ** 2 + rise ** 2));

  const bottomPlateLineal = parseFloat((wallLength / 1000).toFixed(2));

  const totalStudLineal = parseFloat(
    (studHeights.reduce((s, h) => s + h, 0) / 1000).toFixed(2)
  );

  const totalLinealMetres = parseFloat(
    (totalStudLineal + rakePlateLength / 1000 + bottomPlateLineal).toFixed(2)
  );

  const pitchAngle = parseFloat(
    ((Math.atan2(rise, wallLength) * 180) / Math.PI).toFixed(1)
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
      result: `arctan( ${rise} ÷ ${wallLength} ) = ${pitchAngle}°`,
    },
    {
      label: 'Stud count',
      formula: 'floor( wall length ÷ stud spacing ) + 1',
      result: `floor( ${wallLength} ÷ ${studSpacing} ) + 1 = ${studCount} studs`,
    },
    {
      label: 'Stud heights',
      formula: 'low height + ( rise × position ÷ wall length )',
      result: `${lowStudHeight}mm → ${highStudHeight}mm, each cut to ${pitchAngle}° at top`,
    },
    {
      label: 'Rake plate length',
      formula: '√( wall length² + rise² )',
      result: `√( ${wallLength}² + ${rise}² ) = ${rakePlateLength}mm`,
    },
  ];

  return {
    outputs: { studCount, lowStudHeight, highStudHeight, rakePlateLength, bottomPlateLineal, totalStudLineal, totalLinealMetres, pitchAngle },
    studHeights,
    steps,
  };
}
