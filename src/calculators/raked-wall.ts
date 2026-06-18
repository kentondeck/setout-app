import type { WorkingStep } from '../components/ApprenticeWorking';

export interface RakedWallInputs {
  wallLength: number;       // mm — horizontal length of wall
  lowHeight: number;        // mm — total wall height at short end (floor to top of rake plate)
  highHeight: number;       // mm — total wall height at tall end
  studSpacing: number;      // mm
  timberThickness: number;  // mm — plate/stud thickness (e.g. 45 for 45×90 framing)
}

export interface RakedWallOutputs extends Record<string, number> {
  studCount: number;
  lowStudHeight: number;      // mm — stud length at short end (after plate deductions)
  highStudHeight: number;     // mm — stud length at tall end (after plate deductions)
  rakePlateLength: number;    // mm
  bottomPlateLineal: number;  // lm
  totalStudLineal: number;    // lm — studs only
  totalLinealMetres: number;  // lm — studs + rake plate + bottom plate
  pitchAngle: number;         // degrees
  rakePlateVertical: number;  // mm — plumb height of the tilted rake plate at any stud
  studCutExtra: number;       // mm to add on the high side of each stud top cut
}

export interface RakedWallResult {
  outputs: RakedWallOutputs;
  studHeights: number[];   // mm height for each stud in order from low to high end
  steps: WorkingStep[];
}

export function calculateRakedWall(inputs: RakedWallInputs): RakedWallResult {
  const { wallLength, lowHeight, highHeight, studSpacing, timberThickness } = inputs;

  const rise = highHeight - lowHeight;
  const pitchRad = Math.atan2(rise, wallLength);
  const pitchAngle = parseFloat(((pitchRad * 180) / Math.PI).toFixed(1));

  // Rake plate sits at an angle — its plumb (vertical) height at any stud is t/cos(θ).
  // Keep 1dp on every mm output so cut lengths don't accumulate rounding drift.
  const rakePlateVertical = parseFloat((timberThickness / Math.cos(pitchRad)).toFixed(1));

  // Total deduction from each stud: bottom plate (flat) + rake plate (angled)
  const studDeduction = timberThickness + rakePlateVertical;

  // Extra mm on the high side of each stud top cut: t × tan(θ)
  const studCutExtra = parseFloat((timberThickness * Math.tan(pitchRad)).toFixed(1));

  const studCount = Math.floor(wallLength / studSpacing) + 1;

  // Stud lengths: interpolate total height at each position, then deduct both plates
  const studHeights: number[] = [];
  for (let i = 0; i < studCount; i++) {
    const position = i * studSpacing;
    const totalHeight = lowHeight + (rise * position) / wallLength;
    studHeights.push(parseFloat((totalHeight - studDeduction).toFixed(1)));
  }

  const lowStudHeight = studHeights[0];
  const highStudHeight = studHeights[studCount - 1];

  const rakePlateLength = parseFloat(Math.sqrt(wallLength ** 2 + rise ** 2).toFixed(1));
  const bottomPlateLineal = parseFloat((wallLength / 1000).toFixed(2));

  const totalStudLineal = parseFloat(
    (studHeights.reduce((s, h) => s + h, 0) / 1000).toFixed(2)
  );

  const totalLinealMetres = parseFloat(
    (totalStudLineal + rakePlateLength / 1000 + bottomPlateLineal).toFixed(2)
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
      label: 'Plate deductions',
      formula: 'bottom plate (flat) + rake plate (t ÷ cos θ)',
      result: `${timberThickness}mm + ${timberThickness}mm ÷ cos(${pitchAngle}°) = ${timberThickness}mm + ${rakePlateVertical}mm = ${studDeduction}mm total`,
    },
    {
      label: 'Stud count',
      formula: 'floor( wall length ÷ stud spacing ) + 1',
      result: `floor( ${wallLength} ÷ ${studSpacing} ) + 1 = ${studCount} studs`,
    },
    {
      label: 'Stud lengths',
      formula: 'total height at position − plate deductions',
      result: `${lowStudHeight}mm → ${highStudHeight}mm (short side of top cut)`,
    },
    {
      label: 'Top cut detail',
      formula: 'cut at pitch angle; high side = short side + t × tan( θ )',
      result: `Cut at ${pitchAngle}° — add ${studCutExtra}mm on high side`,
    },
    {
      label: 'Rake plate length',
      formula: '√( wall length² + rise² )',
      result: `√( ${wallLength}² + ${rise}² ) = ${rakePlateLength}mm`,
    },
  ];

  return {
    outputs: { studCount, lowStudHeight, highStudHeight, rakePlateLength, bottomPlateLineal, totalStudLineal, totalLinealMetres, pitchAngle, rakePlateVertical, studCutExtra },
    studHeights,
    steps,
  };
}
