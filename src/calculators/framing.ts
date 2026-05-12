import type { WorkingStep } from '../components/ApprenticeWorking';

export interface FramingInputs {
  wallLength: number;   // metres
  wallHeight: number;   // metres
  studSpacing: number;  // mm (450 or 600)
  includeNoggins: boolean;
  nogginRows: number;   // number of noggin rows (typically 1–2)
}

export interface FramingOutputs extends Record<string, number> {
  studCount: number;
  topPlateLineal: number;
  bottomPlateLineal: number;
  nogginCount: number;
  totalLinealMetres: number;
}

export interface FramingResult {
  outputs: FramingOutputs;
  steps: WorkingStep[];
}

export function calculateFraming(inputs: FramingInputs): FramingResult {
  const { wallLength, wallHeight, studSpacing, includeNoggins, nogginRows } = inputs;

  // Studs: one at each end + intermediate studs spaced at studSpacing
  const studCount = Math.floor((wallLength * 1000) / studSpacing) + 1;

  // Double top plate + single bottom plate
  const topPlateLineal = parseFloat((wallLength * 2).toFixed(2));
  const bottomPlateLineal = parseFloat(wallLength.toFixed(2));

  // Noggins run between studs, each noggin = stud spacing - stud width (approx 90mm)
  // Number of noggins = (studCount - 1) gaps × nogginRows
  const nogginCount = includeNoggins ? (studCount - 1) * nogginRows : 0;

  // Studs lineal metres + plates + noggins
  const studsLineal = parseFloat((studCount * wallHeight).toFixed(2));
  const nogginsLineal = includeNoggins
    ? parseFloat((nogginCount * ((studSpacing - 90) / 1000)).toFixed(2))
    : 0;
  const totalLinealMetres = parseFloat(
    (studsLineal + topPlateLineal + bottomPlateLineal + nogginsLineal).toFixed(2)
  );

  const steps: WorkingStep[] = [
    {
      label: 'Stud count',
      formula: 'floor( wall length (mm) ÷ stud spacing ) + 1',
      result: `floor( ${wallLength * 1000} ÷ ${studSpacing} ) + 1 = ${studCount} studs`,
    },
    {
      label: 'Top plate',
      formula: 'wall length × 2 (double top plate)',
      result: `${wallLength}m × 2 = ${topPlateLineal}lm`,
    },
    {
      label: 'Bottom plate',
      formula: 'wall length × 1',
      result: `${wallLength}m = ${bottomPlateLineal}lm`,
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
            formula: 'nog count × (stud spacing − 90mm stud width)',
            result: `${nogginCount} × ${((studSpacing - 90) / 1000).toFixed(3)}m = ${nogginsLineal}lm`,
          },
        ]
      : []),
    {
      label: 'Total lineal metres',
      formula: 'studs + top plates + bottom plate' + (includeNoggins ? ' + nogs' : ''),
      result: `${studsLineal} + ${topPlateLineal} + ${bottomPlateLineal}${includeNoggins ? ` + ${nogginsLineal}` : ''} = ${totalLinealMetres}lm`,
    },
  ];

  return {
    outputs: { studCount, topPlateLineal, bottomPlateLineal, nogginCount, totalLinealMetres },
    steps,
  };
}
