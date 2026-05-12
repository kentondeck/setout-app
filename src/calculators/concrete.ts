import type { WorkingStep } from '../components/ApprenticeWorking';

export interface SlabOutputs extends Record<string, number> {
  exactVolume: number;   // m³ to 2 dp
  orderVolume: number;   // m³ with wastage, rounded up to nearest 0.1
  litres: number;        // whole litres
  weightTonnes: number;  // tonnes to 2 dp
}

export interface PostHoleOutputs extends Record<string, number> {
  volumePerHole: number;  // litres, whole number
  totalVolume: number;    // m³ to 3 dp
  totalLitres: number;    // whole litres
  orderVolume: number;    // m³ with wastage, rounded up to nearest 0.1
  bagCount: number;       // 20 kg bags (0 if ready-mix)
  useBagMix: number;      // 1 = bag mix, 0 = ready-mix
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
  const { holeType, diameter, sideWidth, depth, numHoles, wastage } = inputs;

  let volumePerHoleM3: number;
  let shapeFormula: string;
  let shapeResult: string;

  if (holeType === 'round' && diameter !== undefined) {
    const r = diameter / 2;
    volumePerHoleM3 = (Math.PI * r * r * depth) / 1_000_000_000;
    shapeFormula = 'π × radius² × depth ÷ 1,000,000,000';
    shapeResult = `π × (${r}mm)² × ${depth}mm ÷ 1,000,000,000`;
  } else {
    const s = sideWidth ?? 0;
    volumePerHoleM3 = (s * s * depth) / 1_000_000_000;
    shapeFormula = 'side² × depth ÷ 1,000,000,000';
    shapeResult = `${s}mm × ${s}mm × ${depth}mm ÷ 1,000,000,000`;
  }

  const volumePerHole = Math.round(volumePerHoleM3 * 1000);
  const totalVolumeM3 = volumePerHoleM3 * numHoles;
  const totalLitres = Math.round(totalVolumeM3 * 1000);
  const totalVolume = parseFloat(totalVolumeM3.toFixed(3));
  const withWastage = totalVolumeM3 * (1 + wastage);
  const orderVolume = parseFloat(ceilToTenth(withWastage).toFixed(1));
  const useBagMix = totalVolumeM3 < 0.2 ? 1 : 0;
  const bagCount = useBagMix ? Math.ceil(withWastage / 0.009) : 0;

  const steps: WorkingStep[] = [
    {
      label: 'Volume per hole',
      formula: shapeFormula,
      result: `${shapeResult} = ${volumePerHole} L`,
    },
    {
      label: `Total volume (${numHoles} hole${numHoles !== 1 ? 's' : ''})`,
      formula: `Volume per hole × ${numHoles}`,
      result: `${volumePerHole} L × ${numHoles} = ${totalLitres} L (${totalVolume} m³)`,
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
    outputs: { volumePerHole, totalVolume, totalLitres, orderVolume, bagCount, useBagMix },
    steps,
  };
}
