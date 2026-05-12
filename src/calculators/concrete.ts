import type { WorkingStep } from '../components/ApprenticeWorking';

export interface SlabOutputs extends Record<string, number> {
  exactVolume: number;   // m³ to 2 dp
  orderVolume: number;   // m³ with wastage, rounded up to nearest 0.1
  litres: number;        // whole litres
  weightTonnes: number;  // tonnes to 2 dp
}

export interface PostHoleOutputs extends Record<string, number> {
  volumePerHole: number;     // m³ — net per hole after post deduction
  postVolumePerHole: number; // m³ — post volume deducted per hole (0 if not deducting)
  totalVolume: number;       // m³ net total
  orderVolume: number;       // m³ with wastage, rounded up to nearest 0.1
  bagCount: number;          // 20 kg bags (0 if ready-mix)
  useBagMix: number;         // 1 = bag mix, 0 = ready-mix
}

export interface SlabInputs {
  length: number;    // mm
  width: number;     // mm
  thickness: number; // mm
  wastage: number;   // fraction e.g. 0.10
}

export interface PostHoleInputs {
  holeType: 'round' | 'square';
  diameter?: number;  // mm (round holes)
  sideWidth?: number; // mm (square holes)
  depth: number;      // mm
  numHoles: number;
  wastage: number;    // fraction e.g. 0.10
  postShape?: 'round' | 'square';  // optional post deduction
  postSize?: number;               // mm — diameter (round) or side (square)
}

// Round up to nearest 0.1 m³ without floating-point drift
function ceilToTenth(value: number): number {
  return Math.ceil(Math.round(value * 100) / 10) / 10;
}

export function calculateSlab(inputs: SlabInputs): { outputs: SlabOutputs; steps: WorkingStep[] } {
  const { length, width, thickness, wastage } = inputs;

  const exactVolume = parseFloat(((length * width * thickness) / 1_000_000_000).toFixed(2));
  const withWastage = exactVolume * (1 + wastage);
  const orderVolume = parseFloat(ceilToTenth(withWastage).toFixed(1));
  const litres = Math.round(exactVolume * 1000);
  const weightTonnes = parseFloat((exactVolume * 2.4).toFixed(2));

  const steps: WorkingStep[] = [
    {
      label: 'Volume',
      formula: 'Length × Width × Thickness ÷ 1,000,000,000',
      result: `${length}mm × ${width}mm × ${thickness}mm ÷ 1,000,000,000 = ${exactVolume} m³`,
    },
    {
      label: `Add ${Math.round(wastage * 100)}% wastage`,
      formula: `Exact volume × ${(1 + wastage).toFixed(2)}`,
      result: `${exactVolume} m³ × ${(1 + wastage).toFixed(2)} = ${parseFloat(withWastage.toFixed(2))} m³`,
    },
    {
      label: 'Order quantity',
      formula: 'Round up to nearest 0.1 m³',
      result: `Order ${orderVolume} m³`,
    },
    {
      label: 'Estimated weight',
      formula: 'Volume × 2.4 t/m³',
      result: `${exactVolume} × 2.4 = ${weightTonnes} t`,
    },
  ];

  return { outputs: { exactVolume, orderVolume, litres, weightTonnes }, steps };
}

export function calculatePostHoles(inputs: PostHoleInputs): { outputs: PostHoleOutputs; steps: WorkingStep[] } {
  const { holeType, diameter, sideWidth, depth, numHoles, wastage, postShape, postSize } = inputs;

  let grossVolumePerHoleM3: number;
  let shapeFormula: string;
  let shapeResult: string;

  if (holeType === 'round' && diameter !== undefined) {
    const r = diameter / 2;
    grossVolumePerHoleM3 = (Math.PI * r * r * depth) / 1_000_000_000;
    shapeFormula = 'π × radius² × depth ÷ 1,000,000,000';
    shapeResult = `π × (${r}mm)² × ${depth}mm ÷ 1,000,000,000`;
  } else {
    const s = sideWidth ?? 0;
    grossVolumePerHoleM3 = (s * s * depth) / 1_000_000_000;
    shapeFormula = 'side² × depth ÷ 1,000,000,000';
    shapeResult = `${s}mm × ${s}mm × ${depth}mm ÷ 1,000,000,000`;
  }

  // Post deduction
  let postVolumeM3 = 0;
  let postFormula = '';
  let postResult = '';
  if (postShape && postSize && postSize > 0) {
    if (postShape === 'round') {
      const pr = postSize / 2;
      postVolumeM3 = (Math.PI * pr * pr * depth) / 1_000_000_000;
      postFormula = 'π × (post radius)² × depth ÷ 1,000,000,000';
      postResult = `π × (${pr}mm)² × ${depth}mm = ${parseFloat(postVolumeM3.toFixed(4))} m³ per post`;
    } else {
      postVolumeM3 = (postSize * postSize * depth) / 1_000_000_000;
      postFormula = 'post side² × depth ÷ 1,000,000,000';
      postResult = `${postSize}mm × ${postSize}mm × ${depth}mm = ${parseFloat(postVolumeM3.toFixed(4))} m³ per post`;
    }
  }

  const netVolumePerHoleM3 = Math.max(0, grossVolumePerHoleM3 - postVolumeM3);
  const postVolumePerHole = parseFloat(postVolumeM3.toFixed(4));
  const volumePerHole = parseFloat(netVolumePerHoleM3.toFixed(4));
  const totalVolumeM3 = netVolumePerHoleM3 * numHoles;
  const totalVolume = parseFloat(totalVolumeM3.toFixed(3));
  const withWastage = totalVolumeM3 * (1 + wastage);
  const orderVolume = parseFloat(ceilToTenth(withWastage).toFixed(1));
  const useBagMix = totalVolumeM3 < 0.2 ? 1 : 0;
  const bagCount = useBagMix ? Math.ceil(withWastage / 0.009) : 0;

  const steps: WorkingStep[] = [
    {
      label: 'Hole volume',
      formula: shapeFormula,
      result: `${shapeResult} = ${parseFloat(grossVolumePerHoleM3.toFixed(4))} m³ per hole`,
    },
    ...(postVolumeM3 > 0 ? [{
      label: 'Deduct post volume',
      formula: postFormula,
      result: `${postResult} → net ${volumePerHole} m³ per hole`,
    }] : []),
    {
      label: `Total net volume (${numHoles} hole${numHoles !== 1 ? 's' : ''})`,
      formula: `Net per hole × ${numHoles}`,
      result: `${volumePerHole} m³ × ${numHoles} = ${totalVolume} m³`,
    },
    {
      label: `Add ${Math.round(wastage * 100)}% wastage`,
      formula: `Total × ${(1 + wastage).toFixed(2)}`,
      result: `${totalVolume} m³ × ${(1 + wastage).toFixed(2)} = ${parseFloat(withWastage.toFixed(3))} m³`,
    },
    useBagMix
      ? {
          label: 'Bag mix recommended',
          formula: 'Total < 0.2 m³ — use 20 kg bags (each yields ~0.009 m³)',
          result: `Bags needed = ⌈${parseFloat(withWastage.toFixed(3))} ÷ 0.009⌉ = ${bagCount} bags`,
        }
      : {
          label: 'Ready-mix recommended',
          formula: 'Total ≥ 0.2 m³ — order ready-mix',
          result: `Order ${orderVolume} m³ ready-mix`,
        },
  ];

  return {
    outputs: { volumePerHole, postVolumePerHole, totalVolume, orderVolume, bagCount, useBagMix },
    steps,
  };
}
