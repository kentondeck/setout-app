import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateSetout } from '../calculators/setout';
import type { SetoutOutputs } from '../calculators/setout';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';

type InputMode = 'find' | 'check';

interface Inputs {
  sideA: string;
  sideB: string;
  measured: string;
}

const DEFAULTS: Inputs = { sideA: '', sideB: '', measured: '' };

export function SetoutCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [mode, setMode] = useState<InputMode>('find');
  const [result, setResult] = useState<{ outputs: SetoutOutputs; steps: WorkingStep[] } | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  // Live diagonal preview
  const previewDiagonal = inputs.sideA && inputs.sideB
    ? Math.round(Math.sqrt(parseFloat(inputs.sideA) ** 2 + parseFloat(inputs.sideB) ** 2))
    : null;

  function handleCalculate() {
    const sideA = parseFloat(inputs.sideA);
    const sideB = parseFloat(inputs.sideB);

    if (!sideA || sideA <= 0) { setError('Enter side A.'); return; }
    if (!sideB || sideB <= 0) { setError('Enter side B.'); return; }

    let measured: number | undefined;
    if (mode === 'check') {
      measured = parseFloat(inputs.measured);
      if (!measured || measured <= 0) { setError('Enter your measured diagonal.'); return; }
    }

    setError('');

    const calc = calculateSetout({ sideA, sideB, measured });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'setout',
      timestamp: Date.now(),
      inputs: { sideA, sideB, ...(measured !== undefined && { measured }) },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const cardStyle = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)' as const,
    padding: '18px 16px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 16,
  };

  const toggleStyle = (active: boolean) => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: '0.5px solid var(--color-border)',
    background: active ? 'var(--color-orange)' : 'var(--color-bg)',
    color: active ? '#fff' : 'var(--color-text)',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  const absError = result ? Math.abs(result.outputs.error) : 0;
  const isSquare = result && result.outputs.error === 0;
  const checkColor = isSquare ? '#16a34a' : absError <= 5 ? '#d97706' : '#e53e3e';
  const checkBg = isSquare ? '#f0fdf4' : absError <= 5 ? '#fffbeb' : '#fff5f5';
  const checkBorder = isSquare ? '#22c55e' : absError <= 5 ? '#fbbf24' : '#fc8181';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Square Check"
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={cardStyle}>
          {/* Mode toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MODE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={toggleStyle(mode === 'find')} onClick={() => { setMode('find'); setResult(null); setError(''); }}>
                Find diagonal
              </button>
              <button style={toggleStyle(mode === 'check')} onClick={() => { setMode('check'); setResult(null); setError(''); }}>
                Check square
              </button>
            </div>
          </div>

          {/* Sides */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Side A" value={inputs.sideA} onChange={set('sideA')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3000', m: 'e.g. 3' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Side B" value={inputs.sideB} onChange={set('sideB')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 4000', m: 'e.g. 4' }} />
            </div>
          </div>

          {/* Measured diagonal (check mode only) */}
          {mode === 'check' && (
            <NumberInput
              label="Measured diagonal"
              value={inputs.measured}
              onChange={set('measured')}
              units={['mm', 'm']}
              placeholders={{ mm: 'e.g. 5000', m: 'e.g. 5' }}
              hint={previewDiagonal ? `required ${previewDiagonal}mm` : undefined}
            />
          )}
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>}

        <button
          onClick={handleCalculate}
          style={{
            background: 'var(--color-orange)', color: '#fff', border: 'none',
            borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.3px',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Calculate
        </button>

        {result && (
          <>
            {/* Diagonal result */}
            <div style={{ display: 'grid', gridTemplateColumns: mode === 'check' ? '1fr 1fr' : '1fr', gap: 10 }}>
              <ResultCard label="Diagonal" value={result.outputs.diagonal} unit="mm" accent />
              {mode === 'check' && (
                <ResultCard label="Measured" value={parseFloat(inputs.measured)} unit="mm" />
              )}
            </div>

            {/* Check square callout */}
            {mode === 'check' && (
              <div style={{
                background: checkBg,
                border: `0.5px solid ${checkBorder}`,
                borderRadius: 10,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: checkColor }}>
                  {isSquare
                    ? 'Perfectly square'
                    : `${absError}mm out of square`}
                </p>
                {!isSquare && (
                  <p style={{ margin: 0, fontSize: 13, color: checkColor }}>
                    {result.outputs.error > 0
                      ? `Diagonal is too long — pull in ${absError}mm`
                      : `Diagonal is too short — push out ${absError}mm`}
                  </p>
                )}
              </div>
            )}

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={mode === 'check' && !isSquare
                ? `${absError}mm out — ${result.outputs.error > 0 ? 'pull in' : 'push out'} ${absError}mm`
                : `${result.outputs.diagonal}mm diagonal`}
              finalLabel={mode === 'check' ? 'Square check' : 'Required diagonal'}
              visible={settings.apprenticeMode}
              id="setout"
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.setout[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
