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

export interface MixRatio {
  cement: number;
  sand: number;
  aggregate: number;
}

export interface MixInputs {
  volumeM3: number; // wet concrete volume required — enter however much you actually need, wastage included
  ratio: MixRatio;  // parts by volume, e.g. 1:2:4
}

export interface MixOutputs extends Record<string, number> {
  wetVolume: number;
  dryVolume: number;
  cementM3: number;
  cementKg: number;
  cementBags: number;
  sandM3: number;
  sandKg: number;
  aggregateM3: number;
  aggregateKg: number;
  waterLitres: number;
}

// Dry loose cement/sand/aggregate compact down once mixed and wetted — the standard trade allowance
// is to batch 1.54x the wet (finished) volume as dry material. Densities are typical values used for
// batching by volume; real bag/quarry material varies, so this is a solid starting point, not a
// certified mix design — for structural work requiring a specific MPa rating, use certified ready-mix.
const DRY_VOLUME_FACTOR = 1.54;
const CEMENT_DENSITY_KG_M3 = 1440;
const SAND_DENSITY_KG_M3 = 1600;
const AGGREGATE_DENSITY_KG_M3 = 1550;
const CEMENT_BAG_KG = 20;
const WATER_CEMENT_RATIO = 0.5; // litres of water per kg of cement — general-purpose rule of thumb

export function calculateConcreteMix(inputs: MixInputs): { outputs: MixOutputs; steps: WorkingStep[] } {
  const { volumeM3, ratio } = inputs;
  const totalParts = ratio.cement + ratio.sand + ratio.aggregate;

  const dryVolume = parseFloat((volumeM3 * DRY_VOLUME_FACTOR).toFixed(3));

  const cementM3 = parseFloat((dryVolume * (ratio.cement / totalParts)).toFixed(3));
  const sandM3 = parseFloat((dryVolume * (ratio.sand / totalParts)).toFixed(3));
  const aggregateM3 = parseFloat((dryVolume * (ratio.aggregate / totalParts)).toFixed(3));

  const cementKg = parseFloat((cementM3 * CEMENT_DENSITY_KG_M3).toFixed(1));
  const sandKg = parseFloat((sandM3 * SAND_DENSITY_KG_M3).toFixed(1));
  const aggregateKg = parseFloat((aggregateM3 * AGGREGATE_DENSITY_KG_M3).toFixed(1));

  const cementBags = Math.ceil(cementKg / CEMENT_BAG_KG);
  const waterLitres = Math.round(cementKg * WATER_CEMENT_RATIO);

  const ratioLabel = `${ratio.cement}:${ratio.sand}:${ratio.aggregate}`;

  const steps: WorkingStep[] = [
    {
      label: 'Dry volume',
      explanation: `Dry loose materials compact once mixed and wetted — allow ${DRY_VOLUME_FACTOR}× the wet concrete volume`,
      calculation: `${volumeM3} × ${DRY_VOLUME_FACTOR}`,
      result: `${dryVolume} m³ dry materials`,
    },
    {
      label: 'Cement',
      explanation: `${ratio.cement} part${ratio.cement !== 1 ? 's' : ''} of ${totalParts} in a ${ratioLabel} mix`,
      calculation: `${dryVolume} × (${ratio.cement} ÷ ${totalParts}) × ${CEMENT_DENSITY_KG_M3} kg/m³`,
      result: `${cementKg} kg → ${cementBags} × 20kg bags`,
    },
    {
      label: 'Sand',
      explanation: `${ratio.sand} part${ratio.sand !== 1 ? 's' : ''} of ${totalParts}`,
      calculation: `${dryVolume} × (${ratio.sand} ÷ ${totalParts}) × ${SAND_DENSITY_KG_M3} kg/m³`,
      result: `${sandM3} m³ (${sandKg} kg)`,
    },
    {
      label: 'Aggregate',
      explanation: `${ratio.aggregate} part${ratio.aggregate !== 1 ? 's' : ''} of ${totalParts}`,
      calculation: `${dryVolume} × (${ratio.aggregate} ÷ ${totalParts}) × ${AGGREGATE_DENSITY_KG_M3} kg/m³`,
      result: `${aggregateM3} m³ (${aggregateKg} kg)`,
    },
    {
      label: 'Water',
      explanation: `Rule-of-thumb ${WATER_CEMENT_RATIO} water-cement ratio — adjust for aggregate moisture and site conditions`,
      calculation: `${cementKg} kg × ${WATER_CEMENT_RATIO}`,
      result: `${waterLitres} L`,
    },
  ];

  return {
    outputs: { wetVolume: volumeM3, dryVolume, cementM3, cementKg, cementBags, sandM3, sandKg, aggregateM3, aggregateKg, waterLitres },
    steps,
  };
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
