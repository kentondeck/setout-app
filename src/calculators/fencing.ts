import type { WorkingStep } from '../components/ApprenticeWorking';

export type FenceType = 'paling' | 'rail';
export type PalingStyle = 'lapped' | 'tight' | 'open';

export interface FencingInputs {
  runLength: number;         // m
  height: number;            // m above ground
  postSpacing: number;       // m centre to centre
  fenceType: FenceType;
  railCount: number;
  palingWidthMm: number;     // mm
  palingStyle: PalingStyle;
  palingOverlapMm: number;   // mm — lapped style
  palingGapMm: number;       // mm — open style
  postHoleDiameterMm: number; // mm — auger size
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
  totalConcreteVolM3: number;
  concretePerHoleBags: number;
  totalConcreteBags: number;
  recommendTruck: number; // 1 = order ready-mix by the m³ instead of bags, 0 = bag mix
  framingNailCount: number;
  framingNailBoxes: number;
  palingNailCount: number;
  palingNailBoxes: number;
}

export interface FencingResult {
  outputs: FencingOutputs;
  steps: WorkingStep[];
}

const CONCRETE_BAG_M3 = 0.009;   // 20 kg premix bag yield — matches concrete.ts; slightly conservative so bag counts round up rather than fall short
const TRUCK_BAG_THRESHOLD = 30;  // past this many bags, hand-mixing on site stops being worth it — order ready-mix by the m³ instead
const FRAMING_NAILS_PER_BOX = 500;  // typical trade box of 75-90mm bullet/framing nails for skew-nailing rails to posts
const PALING_NAILS_PER_BOX = 1000;  // typical trade box of 30-40mm flat-head nails for fixing palings to rails

export function calculateFencing(inputs: FencingInputs): FencingResult {
  const { runLength, height, postSpacing, fenceType, railCount, palingWidthMm, palingStyle, palingOverlapMm, palingGapMm, postHoleDiameterMm } = inputs;
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
    (Math.PI * Math.pow(postHoleDiameterMm / 2000, 2) * (postHoleDepthMm / 1000)).toFixed(3)
  );
  const totalConcreteVolM3 = parseFloat((postHoleVolM3 * postCount).toFixed(3));
  const concretePerHoleBags = Math.ceil(postHoleVolM3 / CONCRETE_BAG_M3);
  const totalConcreteBags = concretePerHoleBags * postCount;
  const recommendTruck = totalConcreteBags > TRUCK_BAG_THRESHOLD ? 1 : 0;
  steps.push({
    label: 'Concrete per post hole',
    explanation: `Cylindrical hole — ${postHoleDiameterMm} mm diameter × ${postHoleDepthMm} mm deep`,
    calculation: `π × (${postHoleDiameterMm / 2} mm)² × ${postHoleDepthMm} mm`,
    result: `${postHoleVolM3} m³ × ${postCount} holes = ${totalConcreteVolM3} m³ total`,
  });
  steps.push(
    recommendTruck
      ? {
          label: 'Order method',
          explanation: `${totalConcreteBags} bags exceeds the ${TRUCK_BAG_THRESHOLD}-bag hand-mix threshold`,
          calculation: `${totalConcreteBags} bags > ${TRUCK_BAG_THRESHOLD}`,
          result: `Order ${totalConcreteVolM3} m³ ready-mix by truck instead of bags`,
        }
      : {
          label: 'Order method',
          explanation: `${totalConcreteBags} bags is within the ${TRUCK_BAG_THRESHOLD}-bag hand-mix threshold`,
          calculation: `${postHoleVolM3} m³ ÷ ${CONCRETE_BAG_M3} m³/bag = ${concretePerHoleBags} per hole`,
          result: `${concretePerHoleBags} × 20 kg bags per hole → ${totalConcreteBags} bags total`,
        }
  );

  // Fixings — nails
  // Rails are skew-nailed to each post, 2 nails per rail per post (both faces, standard practice)
  const framingNailCount = railCount * postCount * 2;
  const framingNailBoxes = Math.ceil(framingNailCount / FRAMING_NAILS_PER_BOX);
  steps.push({
    label: 'Framing nails',
    explanation: `${railCount} rails skew-nailed at each of ${postCount} posts, 2 nails per connection`,
    calculation: `${railCount} × ${postCount} × 2`,
    result: `${framingNailCount} nails → ${framingNailBoxes} box${framingNailBoxes !== 1 ? 'es' : ''}`,
  });

  let palingNailCount = 0;
  let palingNailBoxes = 0;
  if (fenceType === 'paling') {
    palingNailCount = palingCount * railCount * 2;
    palingNailBoxes = Math.ceil(palingNailCount / PALING_NAILS_PER_BOX);
    steps.push({
      label: 'Paling nails',
      explanation: '2 nails per paling per rail it crosses',
      calculation: `${palingCount} × ${railCount} × 2`,
      result: `${palingNailCount} nails → ${palingNailBoxes} box${palingNailBoxes !== 1 ? 'es' : ''}`,
    });
  }

  return {
    outputs: {
      postCount,
      embedmentMm,
      postTotalLengthMm,
      railLinealM,
      palingCount,
      postHoleDiameterMm,
      postHoleDepthMm,
      postHoleVolM3,
      totalConcreteVolM3,
      concretePerHoleBags,
      totalConcreteBags,
      recommendTruck,
      framingNailCount,
      framingNailBoxes,
      palingNailCount,
      palingNailBoxes,
    },
    steps,
  };
}
