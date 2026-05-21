import type { WorkingStep } from '../components/ApprenticeWorking';

export type FenceType = 'paling' | 'rail';
export type PalingStyle = 'lapped' | 'tight' | 'open';

export interface FencingInputs {
  runLength: number;       // m
  height: number;          // m above ground
  postSpacing: number;     // m centre to centre
  fenceType: FenceType;
  railCount: number;
  palingWidthMm: number;   // mm
  palingStyle: PalingStyle;
  palingOverlapMm: number; // mm — lapped style
  palingGapMm: number;     // mm — open style
}

export interface FencingOutputs extends Record<string, number> {
  postCount: number;
  embedmentMm: number;
  postTotalLengthMm: number;
  railLinealM: number;
  palingCount: number;
  postHoleDiameterMm: number;
  postHoleDepthMm: number;
  postHoleVolM3: number;
  concretePerHoleBags: number;
  totalConcreteBags: number;
}

export interface FencingResult {
  outputs: FencingOutputs;
  steps: WorkingStep[];
}

const CONCRETE_BAG_M3 = 0.010; // 20 kg premix bag yield
const HOLE_DIAMETER_MM = 250;  // standard auger for 90×90 posts

export function calculateFencing(inputs: FencingInputs): FencingResult {
  const { runLength, height, postSpacing, fenceType, railCount, palingWidthMm, palingStyle, palingOverlapMm, palingGapMm } = inputs;
  const steps: WorkingStep[] = [];

  // Posts
  const postCount = Math.floor(runLength / postSpacing) + 1;
  steps.push({
    label: 'Post count',
    explanation: 'Divide run by post spacing, add 1 for the end post',
    calculation: `⌊${runLength} ÷ ${postSpacing}⌋ + 1`,
    result: `${postCount} posts`,
  });

  // Embedment: 600 mm min for fences ≤ 1.8 m, ~1/3 of total for taller
  const embedmentMm = height <= 1.8
    ? 600
    : Math.round(height * 1000 * 0.33 / 100) * 100;
  const postTotalLengthMm = height * 1000 + embedmentMm;
  steps.push({
    label: 'Post length',
    explanation: 'Fence height above ground plus embedment depth (600 mm min, ~1/3 of total for taller fences)',
    calculation: `${height * 1000} mm + ${embedmentMm} mm embedment`,
    result: `${postTotalLengthMm} mm total post length`,
  });

  // Rails
  const railLinealM = parseFloat((runLength * railCount).toFixed(1));
  steps.push({
    label: 'Rail lineal metres',
    explanation: `${railCount} rails running the full fence length`,
    calculation: `${runLength} m × ${railCount} rails`,
    result: `${railLinealM} lm`,
  });

  // Palings
  let palingCount = 0;
  if (fenceType === 'paling') {
    const effectiveCoverMm =
      palingStyle === 'lapped' ? palingWidthMm - palingOverlapMm :
      palingStyle === 'open'   ? palingWidthMm + palingGapMm :
      palingWidthMm;
    palingCount = Math.ceil((runLength * 1000) / effectiveCoverMm);
    const styleNote =
      palingStyle === 'lapped' ? `${palingWidthMm} − ${palingOverlapMm} mm overlap` :
      palingStyle === 'open'   ? `${palingWidthMm} + ${palingGapMm} mm gap` :
      `${palingWidthMm} mm tight`;
    steps.push({
      label: 'Paling count',
      explanation: 'Run divided by effective cover per paling',
      calculation: `${runLength * 1000} mm ÷ ${effectiveCoverMm} mm (${styleNote})`,
      result: `${palingCount} palings`,
    });
  }

  // Post holes
  const postHoleDepthMm = embedmentMm;
  const postHoleVolM3 = parseFloat(
    (Math.PI * Math.pow(HOLE_DIAMETER_MM / 2000, 2) * (postHoleDepthMm / 1000)).toFixed(3)
  );
  const concretePerHoleBags = Math.ceil(postHoleVolM3 / CONCRETE_BAG_M3);
  const totalConcreteBags = concretePerHoleBags * postCount;
  steps.push({
    label: 'Concrete per post hole',
    explanation: `Cylindrical hole — ${HOLE_DIAMETER_MM} mm diameter × ${postHoleDepthMm} mm deep`,
    calculation: `π × (${HOLE_DIAMETER_MM / 2} mm)² × ${postHoleDepthMm} mm`,
    result: `${postHoleVolM3} m³ → ${concretePerHoleBags} × 20 kg bags per hole`,
  });

  return {
    outputs: {
      postCount,
      embedmentMm,
      postTotalLengthMm,
      railLinealM,
      palingCount,
      postHoleDiameterMm: HOLE_DIAMETER_MM,
      postHoleDepthMm,
      postHoleVolM3,
      concretePerHoleBags,
      totalConcreteBags,
    },
    steps,
  };
}
