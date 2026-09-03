import type { WorkingStep } from '../components/ApprenticeWorking';

export interface SetoutInputs {
  sideA: number;     // mm
  sideB: number;     // mm
  measured?: number; // mm — actual diagonal, for check mode
}

export interface SetoutOutputs extends Record<string, number> {
  diagonal: number; // mm — required diagonal
  error: number;    // mm — measured minus required (0 if find-diagonal mode)
}

export interface SetoutResult {
  outputs: SetoutOutputs;
  steps: WorkingStep[];
}

export function calculateSetout(inputs: SetoutInputs): SetoutResult {
  const { sideA, sideB, measured } = inputs;

  const diagonal = parseFloat(Math.sqrt(sideA ** 2 + sideB ** 2).toFixed(1));
  const error = measured !== undefined ? parseFloat((measured - diagonal).toFixed(1)) : 0;

  const steps: WorkingStep[] = [
    {
      label: 'Diagonal (hypotenuse)',
      formula: '√( A² + B² )',
      result: `√( ${sideA}² + ${sideB}² ) = √${sideA ** 2 + sideB ** 2} = ${diagonal}mm`,
    },
    ...(measured !== undefined
      ? [{
          label: 'Square check',
          formula: 'measured − required diagonal',
          result: error === 0
            ? `${measured}mm matches ${diagonal}mm — perfectly square`
            : `${measured}mm − ${diagonal}mm = ${error > 0 ? '+' : ''}${error}mm — ${error > 0 ? 'pull in' : 'push out'} the far corner ${Math.abs(error)}mm`,
        }]
      : []),
  ];

  return { outputs: { diagonal, error }, steps };
}
