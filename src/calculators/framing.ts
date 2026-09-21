import type { WorkingStep } from '../components/ApprenticeWorking';
import { CalcInputError } from './errors';

export interface FramingInputs {
  wallLength: number;   // metres
  wallHeight: number;   // metres
  studSpacing: number;  // mm
  includeNoggins: boolean;
  nogginRows: number;   // number of noggin rows (typically 1–2)
  doubleStuds: boolean;
  doubleTopPlate: boolean;
  // Face-width of the stud along the wall length — 45 mm for NZ 90×45,
  // 35 mm for AU 70×35. Drives noggin length between studs (spacing − face).
  // Optional so existing callers keep working; defaults to 45 mm.
  studFaceWidthMm?: number;
}

export interface FramingOutputs extends Record<string, number> {
  studCount: number;
  topPlateLineal: number;
  bottomPlateLineal: number;
  nogginCount: number;
  totalLinealMetres: number;
  // Echoed back so the page's diagram/material list use the values that
  // actually produced this result, not re-parsed live inputs.
  wallLengthMm: number;
  wallHeightMm: number;
  studSpacingMm: number;
}

export interface FramingResult {
  outputs: FramingOutputs;
  steps: WorkingStep[];
}

export function calculateFraming(inputs: FramingInputs): FramingResult {
  const { wallLength, wallHeight, studSpacing, includeNoggins, nogginRows, doubleStuds, doubleTopPlate } = inputs;
  const studFaceWidthMm = inputs.studFaceWidthMm ?? 45;

  // Unit-scale sanity — wall dimensions are in metres. > 100 almost certainly
  // means mm typed as m (e.g. 4800 instead of 4.8).
  if (wallLength > 100 || wallHeight > 100) {
    throw new CalcInputError('Wall dimensions look too large — enter length and height in metres (e.g. 4.8, not 4800).');
  }
  // Stud spacing is in mm. Anything outside real trade practice means the
  // user entered the wrong unit or a bad number.
  if (studSpacing < 100 || studSpacing > 1200) {
    throw new CalcInputError('Stud spacing should be between 100 and 1200 mm.');
  }
  if (studSpacing <= studFaceWidthMm) {
    throw new CalcInputError('Stud spacing must be greater than the stud face width.');
  }

  // Studs: one at each end + intermediate studs spaced at studSpacing.
  // `ceil(L/s) + 1` gives the right count for any wall length — for an exact
  // multiple it matches `floor + 1`; for non-multiples it adds the extra
  // end stud that floor+1 misses.
  const baseStudCount = Math.ceil((wallLength * 1000) / studSpacing) + 1;
  const studCount = doubleStuds ? baseStudCount * 2 : baseStudCount;

  const topPlateLineal = parseFloat((wallLength * (doubleTopPlate ? 2 : 1)).toFixed(2));
  const bottomPlateLineal = parseFloat(wallLength.toFixed(2));

  // Noggins run between stud positions (gaps don't change with double studs)
  const nogginCount = includeNoggins ? (baseStudCount - 1) * nogginRows : 0;

  // Studs lineal metres + plates + noggins
  const studsLineal = parseFloat((studCount * wallHeight).toFixed(2));
  const nogginsLineal = includeNoggins
    ? parseFloat((nogginCount * ((studSpacing - studFaceWidthMm) / 1000)).toFixed(2))
    : 0;
  const totalLinealMetres = parseFloat(
    (studsLineal + topPlateLineal + bottomPlateLineal + nogginsLineal).toFixed(2)
  );

  const steps: WorkingStep[] = [
    {
      label: 'Stud positions',
      formula: 'ceil( wall length (mm) ÷ stud spacing ) + 1',
      result: `ceil( ${wallLength * 1000} ÷ ${studSpacing} ) + 1 = ${baseStudCount} positions`,
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
      formula: `wall length × ${doubleTopPlate ? '2 (double top plate)' : '1 (single top plate)'}`,
      result: `${wallLength}m × ${doubleTopPlate ? 2 : 1} = ${topPlateLineal}lm`,
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
            formula: `nog count × (stud spacing − ${studFaceWidthMm}mm stud face)`,
            result: `${nogginCount} × ${((studSpacing - studFaceWidthMm) / 1000).toFixed(3)}m = ${nogginsLineal}lm`,
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
    outputs: {
      studCount, topPlateLineal, bottomPlateLineal, nogginCount, totalLinealMetres,
      wallLengthMm: Math.round(wallLength * 1000),
      wallHeightMm: Math.round(wallHeight * 1000),
      studSpacingMm: studSpacing,
    },
    steps,
  };
}
