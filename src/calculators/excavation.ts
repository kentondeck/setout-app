import type { WorkingStep } from '../components/ApprenticeWorking';

export interface ExcavationInputs {
  length: number;        // m
  width: number;         // m
  depthNear: number;     // m
  depthFar?: number;     // m — far-end depth for sloped sites
  swellFactor: number;   // decimal e.g. 0.25 = 25%
  truckCapacity: number; // m³
}

export interface ExcavationOutputs extends Record<string, number> {
  bankVolume: number;   // m³ — in-ground (undisturbed) volume
  looseVolume: number;  // m³ — after swell
  swellAdded: number;   // m³ — extra from swell
  truckLoads: number;   // loads required (ceiling)
  avgDepth: number;     // m
  isSloped: number;     // 0 | 1
}

export interface ExcavationResult {
  outputs: ExcavationOutputs;
  steps: WorkingStep[];
}

export function calculateExcavation(inputs: ExcavationInputs): ExcavationResult {
  const { length, width, depthNear, depthFar, swellFactor, truckCapacity } = inputs;

  const isSloped = depthFar !== undefined && depthFar !== depthNear;
  const avgDepth = isSloped ? parseFloat(((depthNear + depthFar!) / 2).toFixed(3)) : depthNear;

  const bankVolume = parseFloat((length * width * avgDepth).toFixed(2));
  const swellAdded = parseFloat((bankVolume * swellFactor).toFixed(2));
  const looseVolume = parseFloat((bankVolume + swellAdded).toFixed(2));
  const truckLoads = Math.ceil(looseVolume / truckCapacity);

  const steps: WorkingStep[] = [
    ...(isSloped ? [{
      label: 'Average depth',
      formula: '(near depth + far depth) ÷ 2',
      result: `(${depthNear}m + ${depthFar}m) ÷ 2 = ${avgDepth}m`,
    }] : []),
    {
      label: 'Bank volume',
      formula: 'length × width × depth',
      result: `${length}m × ${width}m × ${avgDepth}m = ${bankVolume} m³`,
    },
    ...(swellFactor > 0 ? [{
      label: 'Swell adjustment',
      formula: `bank volume × ${Math.round(swellFactor * 100)}% swell factor`,
      result: `${bankVolume} m³ × ${swellFactor} = +${swellAdded} m³ → ${looseVolume} m³ loose`,
    }] : []),
    {
      label: 'Truck loads',
      formula: 'round up (loose volume ÷ truck capacity)',
      result: `⌈${looseVolume} m³ ÷ ${truckCapacity} m³⌉ = ${truckLoads} loads`,
    },
  ];

  return {
    outputs: { bankVolume, looseVolume, swellAdded, truckLoads, avgDepth, isSloped: isSloped ? 1 : 0 },
    steps,
  };
}
