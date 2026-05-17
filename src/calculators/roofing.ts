import type { WorkingStep } from '../components/ApprenticeWorking';

export type RoofType = 'gable' | 'hip' | 'skillion';
export type RoofProfile = 'corrugate' | 'trimdek' | 'superdek';

export interface RoofingInputs {
  roofType: RoofType;
  planLength: number;      // metres, along the ridge direction
  planWidth: number;       // metres, full span eave to eave
  pitchDegrees: number;
  profile: RoofProfile;
  eaveOverhangMm: number;  // mm
  purlinSpacingMm: number; // mm
}

export interface RoofingOutputs extends Record<string, number> {
  sheetCount: number;
  sheetLengthMm: number;
  slopeAreaM2: number;
  ridgeCapM: number;
  hipCapM: number;
  bargeM: number;
  eaveFlashingM: number;
  screwCount: number;
  screwBoxes: number;
  purlinCount: number;
}

export interface RoofingResult {
  outputs: RoofingOutputs;
  steps: WorkingStep[];
}

export const ROOFING_PROFILES: Record<RoofProfile, {
  label: string;
  coverMm: number;
  lapScrews: number;
  fieldScrews: number;
}> = {
  corrugate: { label: 'Corrugate', coverMm: 762, lapScrews: 11, fieldScrews: 6 },
  trimdek:   { label: 'Trimdek',   coverMm: 762, lapScrews: 4,  fieldScrews: 4 },
  superdek:  { label: 'Superdek',  coverMm: 686, lapScrews: 4,  fieldScrews: 4 },
};

const r1 = (n: number) => parseFloat(n.toFixed(1));
const r2 = (n: number) => parseFloat(n.toFixed(2));

export function calculateRoofing(inputs: RoofingInputs): RoofingResult {
  const { roofType, planLength, planWidth, pitchDegrees, profile, eaveOverhangMm, purlinSpacingMm } = inputs;

  const pitchRad = pitchDegrees * Math.PI / 180;
  const { coverMm, lapScrews, fieldScrews } = ROOFING_PROFILES[profile];
  const coverM = coverMm / 1000;

  // Horizontal run from eave to ridge
  const run = roofType === 'skillion' ? planWidth : planWidth / 2;

  // Slope length: eave to ridge along the slope
  const slopeLength = run / Math.cos(pitchRad);

  // Sheet length: slope + eave overhang, rounded up to nearest 100mm for ordering
  const rawSheetLengthMm = slopeLength * 1000 + eaveOverhangMm;
  const sheetLengthMm = Math.ceil(rawSheetLengthMm / 100) * 100;
  const sheetLengthM = sheetLengthMm / 1000;

  // Sheets across each face (number laid side by side)
  const sheetsPerLongFace = Math.ceil(planLength / coverM);

  let sheetCount: number;
  let slopeAreaM2: number;
  let ridgeCapM: number;
  let hipCapM: number;
  let bargeM: number;
  let eaveFlashingM: number;

  if (roofType === 'gable') {
    sheetCount = sheetsPerLongFace * 2;
    slopeAreaM2 = 2 * planLength * slopeLength;
    ridgeCapM = planLength * 1.1;
    hipCapM = 0;
    // 4 rake edges: 2 per gable end × 2 faces, each = sheet length
    bargeM = 4 * sheetLengthM * 1.1;
    eaveFlashingM = planLength * 2 * 1.1;

  } else if (roofType === 'hip') {
    // Hip-end faces are triangular in plan — order a full rectangle and cut at hip angle
    const sheetsPerHipFace = Math.ceil(planWidth / coverM);
    sheetCount = sheetsPerLongFace * 2 + sheetsPerHipFace * 2;
    slopeAreaM2 = (planLength * planWidth) / Math.cos(pitchRad);
    // Ridge shorter than building length for equal-pitch hip
    ridgeCapM = Math.max(0, planLength - planWidth) * 1.1;
    // Hip cap: 4 hips, each slope = (W/2) × √(2 + tan²(pitch))
    const hipSlopeLength = (planWidth / 2) * Math.sqrt(2 + Math.tan(pitchRad) ** 2);
    hipCapM = 4 * hipSlopeLength * 1.1;
    bargeM = 0;
    eaveFlashingM = (2 * planLength + 2 * planWidth) * 1.1;

  } else {
    // Skillion — single face
    sheetCount = sheetsPerLongFace;
    slopeAreaM2 = planLength * slopeLength;
    ridgeCapM = 0;
    hipCapM = 0;
    // 2 side (barge) edges running along the slope
    bargeM = 2 * sheetLengthM * 1.1;
    // Eave flashing at bottom + head flashing at top
    eaveFlashingM = planLength * 2 * 1.1;
  }

  // Purlins per face: spaces + 1 (includes ridge and eave purlins)
  const purlinSpaces = Math.ceil(sheetLengthMm / purlinSpacingMm);
  const purlinCount = purlinSpaces + 1;

  // Screws per sheet
  const fieldRows = Math.max(0, purlinCount - 2);
  const screwsPerSheet = lapScrews * 2 + fieldScrews * fieldRows;

  // Total screws with 10% waste, rounded up to nearest 100
  const screwCount = Math.ceil(screwsPerSheet * sheetCount * 1.1 / 100) * 100;
  const screwBoxes = Math.ceil(screwCount / 250);

  const steps: WorkingStep[] = [
    {
      label: roofType === 'skillion' ? 'Run' : 'Run (half span)',
      formula: roofType === 'skillion' ? 'run = planWidth' : 'run = planWidth ÷ 2',
      result: `${r2(run)}m`,
    },
    {
      label: 'Slope length',
      formula: 'run ÷ cos( pitch )',
      result: `${r2(run)}m ÷ cos(${pitchDegrees}°) = ${r2(slopeLength)}m`,
    },
    {
      label: 'Sheet length',
      formula: 'slope + eave overhang → round up to 100mm',
      result: `${r2(slopeLength)}m + ${eaveOverhangMm}mm = ${sheetLengthMm}mm`,
    },
    {
      label: 'Sheet count',
      formula: roofType === 'gable'
        ? 'ceil( planLength ÷ cover ) × 2 faces'
        : roofType === 'hip'
        ? '( ceil( L ÷ cover ) × 2 ) + ( ceil( W ÷ cover ) × 2 hip ends )'
        : 'ceil( planLength ÷ cover )',
      result: `${sheetCount} sheets`,
    },
    {
      label: 'Purlins per face',
      formula: `ceil( sheetLength ÷ ${purlinSpacingMm}mm ) + 1`,
      result: `${purlinCount} purlins (incl. ridge & eave)`,
    },
    {
      label: 'Screws per sheet',
      formula: `${lapScrews} top + ${lapScrews} bottom + ${fieldScrews} × ${fieldRows} field rows`,
      result: `${screwsPerSheet} per sheet`,
    },
    {
      label: 'Total screws',
      formula: `${screwsPerSheet} × ${sheetCount} sheets × 1.10 waste → nearest 100`,
      result: `${screwCount} screws (${screwBoxes} × 250-pack boxes)`,
    },
    ...(ridgeCapM > 0 ? [{
      label: 'Ridge cap',
      formula: 'ridge length × 1.1 for joins',
      result: `${r1(ridgeCapM)}m to order`,
    }] : []),
    ...(hipCapM > 0 ? [{
      label: 'Hip caps',
      formula: '4 × (W/2) × √(2 + tan²pitch) × 1.1',
      result: `${r1(hipCapM)}m to order`,
    }] : []),
    ...(bargeM > 0 ? [{
      label: roofType === 'gable' ? 'Barge / rake flashing' : 'Barge flashing',
      formula: roofType === 'gable' ? '4 rake edges × sheet length × 1.1' : '2 side edges × sheet length × 1.1',
      result: `${r1(bargeM)}m to order`,
    }] : []),
    {
      label: roofType === 'skillion' ? 'Eave + head flashing' : 'Eave flashing',
      formula: roofType === 'hip' ? '(2L + 2W) × 1.1' : 'planLength × 2 × 1.1',
      result: `${r1(eaveFlashingM)}m to order`,
    },
    {
      label: 'Slope area',
      formula: roofType === 'hip' ? 'planArea ÷ cos(pitch)' : `planLength × slopeLength${roofType === 'gable' ? ' × 2' : ''}`,
      result: `${r1(slopeAreaM2)} m²`,
    },
  ];

  return {
    outputs: {
      sheetCount,
      sheetLengthMm,
      slopeAreaM2: r1(slopeAreaM2),
      ridgeCapM: r1(ridgeCapM),
      hipCapM: r1(hipCapM),
      bargeM: r1(bargeM),
      eaveFlashingM: r1(eaveFlashingM),
      screwCount,
      screwBoxes,
      purlinCount,
    },
    steps,
  };
}
