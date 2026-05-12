import type { WorkingStep } from '../components/ApprenticeWorking';

export interface FramingInputs {
  wallLength: number;   // metres
  wallHeight: number;   // metres
  studSpacing: number;  // mm
  includeNoggins: boolean;
  nogginRows: number;   // number of noggin rows (typically 1–2)
  doubleStuds: boolean;
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
  const { wallLength, wallHeight, studSpacing, includeNoggins, nogginRows, doubleStuds } = inputs;

  // Studs: one at each end + intermediate studs spaced at studSpacing
  const baseStudCount = Math.floor((wallLength * 1000) / studSpacing) + 1;
  const studCount = doubleStuds ? baseStudCount * 2 : baseStudCount;

  // Double top plate + single bottom plate
  const topPlateLineal = parseFloat((wallLength * 2).toFixed(2));
  const bottomPlateLineal = parseFloat(wallLength.toFixed(2));

  // Noggins run between stud positions (gaps don't change with double studs)
  const nogginCount = includeNoggins ? (baseStudCount - 1) * nogginRows : 0;

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
      label: 'Stud positions',
      formula: 'floor( wall length (mm) ÷ stud spacing ) + 1',
      result: `floor( ${wallLength * 1000} ÷ ${studSpacing} ) + 1 = ${baseStudCount} positions`,
    },
    ...(doubleStuds
      ? [{
          label: 'Double studs',
          formula: 'stud positions × 2',
          result: `${baseStudCount} × 2 = ${studCount} studs`,
        }]
      : []),
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
            formula: '(stud positions − 1) × nog rows',
            result: `(${baseStudCount} − 1) × ${nogginRows} = ${nogginCount} nogs`,
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
