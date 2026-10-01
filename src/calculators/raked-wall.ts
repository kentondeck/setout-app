import type { WorkingStep } from '../components/ApprenticeWorking';
import { CalcInputError } from './errors';

export interface RakedWallInputs {
  wallLength: number;       // mm — horizontal length of wall
  lowHeight: number;        // mm — total wall height at short end (floor to top of rake plate)
  highHeight: number;       // mm — total wall height at tall end
  studSpacing: number;      // mm
  timberThickness: number;  // mm — plate/stud thickness (e.g. 45 for 45×90 framing)
  includeNoggins?: boolean;
  nogginRows?: number;      // number of noggin rows (typically 1–2)
  doubleTopPlate?: boolean; // two rake plates stacked — deducts an extra layer
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
  nogginCount: number;
}

export interface RakedWallResult {
  outputs: RakedWallOutputs;
  studHeights: number[];   // mm height for each stud in order from low to high end
  steps: WorkingStep[];
}

export function calculateRakedWall(inputs: RakedWallInputs): RakedWallResult {
  const { wallLength, lowHeight, highHeight, studSpacing, timberThickness, includeNoggins, nogginRows = 1, doubleTopPlate = false } = inputs;

  // Guard against swapped high / low — a negative rise means the calc silently
  // produces a wall that gets SHORTER across its length, which is either
  // upside down or a data-entry mistake.
  if (highHeight <= lowHeight) {
    throw new CalcInputError('High end must be taller than the low end — check the values.');
  }
  // Deducting both plates (bottom + rake) has to leave something for the stud.
  const studDeductionCheck = timberThickness + timberThickness / Math.cos(Math.atan2(highHeight - lowHeight, wallLength));
  if (lowHeight - studDeductionCheck <= 0) {
    throw new CalcInputError('Low end is too short for the plate thicknesses — check heights or timber.');
  }

  const rise = highHeight - lowHeight;
  const pitchRad = Math.atan2(rise, wallLength);
  const pitchAngle = parseFloat(((pitchRad * 180) / Math.PI).toFixed(1));

  // Rake plate sits at an angle — its plumb (vertical) height at any stud is t/cos(θ).
  // Keep 1dp on every mm output so cut lengths don't accumulate rounding drift.
  const rakePlateVertical = parseFloat((timberThickness / Math.cos(pitchRad)).toFixed(1));

  // A double top plate stacks two rake plates, so it takes off two angled
  // layers instead of one.
  const topPlateLayers = doubleTopPlate ? 2 : 1;
  // Total deduction from each stud: bottom plate (flat) + rake top plate(s) (angled)
  const studDeduction = timberThickness + topPlateLayers * rakePlateVertical;

  // Extra mm on the high side of each stud top cut: t × tan(θ)
  const studCutExtra = parseFloat((timberThickness * Math.tan(pitchRad)).toFixed(1));

  // Studs sit at 0 (flush), then exact centres across, with a stud forced onto
  // the wall end — so the final bay is whatever's left over. If that leftover
  // would be a tiny sliver (wall length only just past a spacing multiple), fold
  // it into the end stud instead of doubling up two studs a few mm apart.
  const fullBays = Math.floor(wallLength / studSpacing);
  const endBay = wallLength - fullBays * studSpacing; // leftover past the last full centre
  const MIN_END_BAY = 50; // mm — below this, the end stud absorbs the last centre
  const studCount = Math.max(2, endBay < MIN_END_BAY ? fullBays + 1 : fullBays + 2);
  const lastBayMm = Math.round(wallLength - (studCount - 2) * studSpacing);

  // Stud lengths: interpolate total height at each position, then deduct both plates.
  // The last stud always sits at the wall end (not at studCount × spacing, which
  // may fall short for non-multiple walls), so the tallest stud is dimensioned to
  // the actual wall's high-end height.
  const studHeights: number[] = [];
  for (let i = 0; i < studCount; i++) {
    const position = i === studCount - 1 ? wallLength : i * studSpacing;
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

  // Noggins run between stud positions, same convention as the flat framing calculator.
  // Length between two studs = spacing − stud face-width (timberThickness is that
  // face along the wall length: 45 mm for NZ 90×45, 35 mm for AU 70×35).
  const nogginCount = includeNoggins ? (studCount - 1) * nogginRows : 0;
  const nogginsLineal = includeNoggins
    ? parseFloat((nogginCount * ((studSpacing - timberThickness) / 1000)).toFixed(2))
    : 0;

  // Double top plate needs two rake plates' worth of timber.
  const rakePlateLineal = parseFloat((topPlateLayers * rakePlateLength / 1000).toFixed(2));

  const totalLinealMetres = parseFloat(
    (totalStudLineal + rakePlateLineal + bottomPlateLineal + nogginsLineal).toFixed(2)
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
      formula: `bottom plate (flat) + ${doubleTopPlate ? 'double' : 'single'} rake top plate (t ÷ cos θ)`,
      result: `${timberThickness}mm + ${topPlateLayers} × ${rakePlateVertical}mm = ${studDeduction}mm total`,
    },
    {
      label: 'Stud count',
      formula: 'stud at each end + centres between (final bay takes the remainder)',
      result: `${studCount} studs — ${studSpacing}mm centres, last bay ${lastBayMm}mm`,
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
      result: `√( ${wallLength}² + ${rise}² ) = ${rakePlateLength}mm${doubleTopPlate ? ` × 2 plates = ${rakePlateLineal}lm` : ''}`,
    },
    ...(includeNoggins
      ? [
          {
            label: 'Nog count',
            formula: '(stud count − 1) × nog rows',
            result: `(${studCount} − 1) × ${nogginRows} = ${nogginCount} nogs`,
          },
          {
            label: 'Nogs lineal metres',
            formula: `nog count × (stud spacing − ${timberThickness}mm stud face)`,
            result: `${nogginCount} × ${((studSpacing - timberThickness) / 1000).toFixed(3)}m = ${nogginsLineal}lm`,
          },
        ]
      : []),
  ];

  return {
    outputs: { studCount, lowStudHeight, highStudHeight, rakePlateLength, bottomPlateLineal, totalStudLineal, totalLinealMetres, pitchAngle, rakePlateVertical, studCutExtra, nogginCount },
    studHeights,
    steps,
  };
}
