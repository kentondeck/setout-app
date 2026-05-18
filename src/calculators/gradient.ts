import type { WorkingStep } from '../components/ApprenticeWorking';

export type GradientMode = 'findGradient' | 'findRise' | 'findRun';

export interface GradientInputs {
  mode: GradientMode;
  run: number;           // m (horizontal distance)
  rise: number;          // mm (vertical change)
  gradientRatio: number; // X in 1:X (e.g. 100 for 1:100)
}

export interface GradientOutputs extends Record<string, number> {
  gradientRatio: number; // X in 1:X
  percentage: number;    // %
  angle: number;         // degrees
  rise: number;          // mm
  run: number;           // m
  risePerMetre: number;  // mm/m
}

export interface GradientResult {
  outputs: GradientOutputs;
  steps: WorkingStep[];
}

export function calculateGradient(inputs: GradientInputs): GradientResult {
  const { mode } = inputs;
  const steps: WorkingStep[] = [];

  let run: number;
  let rise: number;
  let gradientRatio: number;
  let percentage: number;
  let angle: number;

  if (mode === 'findGradient') {
    run = inputs.run;
    rise = inputs.rise;
    const runMm = run * 1000;
    gradientRatio = parseFloat((runMm / rise).toFixed(1));
    percentage = parseFloat(((rise / runMm) * 100).toFixed(3));
    angle = parseFloat((Math.atan(rise / runMm) * (180 / Math.PI)).toFixed(2));
    steps.push(
      { label: 'Convert run to mm', formula: 'run × 1000', result: `${run}m × 1000 = ${runMm}mm` },
      { label: 'Gradient ratio', formula: 'run (mm) ÷ rise', result: `${runMm} ÷ ${rise} = 1:${gradientRatio}` },
      { label: 'Percentage', formula: '(rise ÷ run) × 100', result: `(${rise} ÷ ${runMm}) × 100 = ${percentage}%` },
      { label: 'Angle', formula: 'arctan(rise ÷ run)', result: `arctan(${rise} ÷ ${runMm}) = ${angle}°` },
    );
  } else if (mode === 'findRise') {
    run = inputs.run;
    gradientRatio = inputs.gradientRatio;
    const runMm = run * 1000;
    rise = parseFloat((runMm / gradientRatio).toFixed(1));
    percentage = parseFloat((100 / gradientRatio).toFixed(3));
    angle = parseFloat((Math.atan(1 / gradientRatio) * (180 / Math.PI)).toFixed(2));
    steps.push(
      { label: 'Convert run to mm', formula: 'run × 1000', result: `${run}m × 1000 = ${runMm}mm` },
      { label: 'Rise required', formula: 'run (mm) ÷ gradient ratio', result: `${runMm} ÷ ${gradientRatio} = ${rise}mm` },
      { label: 'Percentage', formula: '(1 ÷ ratio) × 100', result: `(1 ÷ ${gradientRatio}) × 100 = ${percentage}%` },
      { label: 'Angle', formula: 'arctan(1 ÷ ratio)', result: `arctan(1 ÷ ${gradientRatio}) = ${angle}°` },
    );
  } else {
    rise = inputs.rise;
    gradientRatio = inputs.gradientRatio;
    const runMm = rise * gradientRatio;
    run = parseFloat((runMm / 1000).toFixed(3));
    percentage = parseFloat((100 / gradientRatio).toFixed(3));
    angle = parseFloat((Math.atan(1 / gradientRatio) * (180 / Math.PI)).toFixed(2));
    steps.push(
      { label: 'Run required (mm)', formula: 'rise × gradient ratio', result: `${rise} × ${gradientRatio} = ${runMm}mm` },
      { label: 'Run required (m)', formula: 'run (mm) ÷ 1000', result: `${runMm} ÷ 1000 = ${run}m` },
      { label: 'Percentage', formula: '(1 ÷ ratio) × 100', result: `(1 ÷ ${gradientRatio}) × 100 = ${percentage}%` },
      { label: 'Angle', formula: 'arctan(1 ÷ ratio)', result: `arctan(1 ÷ ${gradientRatio}) = ${angle}°` },
    );
  }

  const risePerMetre = parseFloat((rise / run).toFixed(1));
  steps.push({ label: 'Rise per metre', formula: 'rise ÷ run', result: `${rise}mm ÷ ${run}m = ${risePerMetre}mm/m` });

  return {
    outputs: { gradientRatio, percentage, angle, rise, run, risePerMetre },
    steps,
  };
}
