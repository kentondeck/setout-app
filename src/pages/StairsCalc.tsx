import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateStairs } from '../calculators/stairs';
import type { StairsOutputs, StairsWarnings } from '../calculators/stairs';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES, STAIR_LIMITS } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { StairDiagram } from '../components/StairDiagram';

interface Inputs {
  totalRise: string;
  totalRun: string;
  preferredRiser: string;
  preferredGoing: string;
}

const DEFAULTS: Inputs = {
  totalRise: '',
  totalRun: '',
  preferredRiser: '',
  preferredGoing: '',
};

export function StairsCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: StairsOutputs; steps: WorkingStep[]; warnings: StairsWarnings } | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const totalRise = parseFloat(inputs.totalRise);
    const totalRun = parseFloat(inputs.totalRun);
    const preferredRiser = parseFloat(inputs.preferredRiser);
    const preferredGoing = inputs.preferredGoing ? parseFloat(inputs.preferredGoing) : undefined;

    if (!totalRise || totalRise <= 0) {
      setError('Enter a total rise to calculate.');
      return;
    }
    if ((!totalRun || totalRun <= 0) && !preferredGoing) {
      setError('Enter a total run, or set a preferred going to calculate the run.');
      return;
    }
    if (!preferredRiser || preferredRiser <= 0) {
      setError('Enter a preferred riser height.');
      return;
    }

    setError('');

    const limits = STAIR_LIMITS[settings.region];
    const calc = calculateStairs({
      totalRise,
      ...(totalRun && totalRun > 0 ? { totalRun } : {}),
      preferredRiser,
      preferredGoing,
      limits,
    });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'stairs',
      timestamp: Date.now(),
      inputs: { totalRise, totalRun, preferredRiser, ...(preferredGoing ? { preferredGoing } : {}) },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const stairRise = result ? parseFloat(inputs.totalRise) : 0;
  const stairPrefRiser = result ? parseFloat(inputs.preferredRiser) : 0;

  const stairsSteps: WorkingStep[] = result ? [
    { label: 'Total rise', explanation: 'The full height from floor to floor', result: `${stairRise} mm` },
    { label: 'Risers needed', explanation: 'Divide the rise by your preferred riser height', calculation: `${stairRise} ÷ ${stairPrefRiser} = ${(stairRise / stairPrefRiser).toFixed(1)}`, result: `Round to ${result.outputs.riserCount} risers` },
    { label: 'Actual riser height', explanation: 'Divide the total rise by the number of risers for the real value', calculation: `${stairRise} ÷ ${result.outputs.riserCount}`, result: `${result.outputs.riserHeight} mm each` },
    { label: 'Treads', explanation: 'Always one less tread than risers', calculation: `${result.outputs.riserCount} - 1`, result: `${result.outputs.treadCount} treads` },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Stairs"
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Total rise" value={inputs.totalRise} onChange={set('totalRise')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 2700', m: 'e.g. 2.7' }} hint="floor to floor" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Total run" value={inputs.totalRun} onChange={set('totalRun')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3000', m: 'e.g. 3' }} hint="optional · leave blank to calculate" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred riser" value={inputs.preferredRiser} onChange={set('preferredRiser')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 175', m: 'e.g. 0.175' }} hint={`${STAIR_LIMITS[settings.region].riserMin}–${STAIR_LIMITS[settings.region].riserMax}mm`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred going" value={inputs.preferredGoing} onChange={set('preferredGoing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 250', m: 'e.g. 0.25' }} hint={`optional · ${STAIR_LIMITS[settings.region].treadMin}–${STAIR_LIMITS[settings.region].treadMax}mm`} />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>
        )}

        <button
          onClick={handleCalculate}
          style={{
            background: 'var(--color-orange)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '16px',
            fontSize: 16,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: '-0.3px',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Calculate
        </button>

        {result && (
          <>
            {/* Derived run callout */}
            {result.warnings.runDerived && (
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                  Total run calculated from preferred going — <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{result.outputs.treadCount} × {inputs.preferredGoing}mm = {result.outputs.treadCount * parseFloat(inputs.preferredGoing)}mm</span>
                </p>
              </div>
            )}

            {/* Compliance warnings */}
            {(result.warnings.riserOutOfRange || result.warnings.treadOutOfRange || result.warnings.walklineOutOfRange || result.warnings.angleOutOfRange) && (
              <div style={{
                background: '#fff8e1',
                border: '0.5px solid #f59e0b',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                  Compliance check — {STAIR_LIMITS[settings.region].standard}
                </p>
                {result.warnings.riserOutOfRange && (
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                    Riser {result.outputs.riserHeight}mm is outside the allowed range ({STAIR_LIMITS[settings.region].riserMin}–{STAIR_LIMITS[settings.region].riserMax}mm)
                  </p>
                )}
                {result.warnings.treadOutOfRange && (
                  <>
                    <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                      Going {result.outputs.treadDepth}mm is outside the allowed range ({STAIR_LIMITS[settings.region].treadMin}–{STAIR_LIMITS[settings.region].treadMax}mm)
                    </p>
                    {result.warnings.suggestedMinRun !== undefined && (
                      <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                        For a compliant going, push total run to {result.warnings.suggestedMinRun}–{result.warnings.suggestedMaxRun}mm
                      </p>
                    )}
                  </>
                )}
                {result.warnings.walklineOutOfRange && (
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                    2R + G = {result.outputs.walklineSum}mm — outside ergonomic range 550–700mm (Blondel rule)
                  </p>
                )}
                {result.warnings.angleOutOfRange && (
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                    Stringer angle {result.outputs.stringerAngle}° is outside 20°–45° (steep / shallow)
                  </p>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Risers" value={result.outputs.riserCount} accent />
                <ResultCard label="Treads" value={result.outputs.treadCount} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Riser height" value={result.outputs.riserHeight} unit="mm" />
                <ResultCard label="Tread depth" value={result.outputs.treadDepth} unit="mm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Stringer" value={result.outputs.stringerLength} unit="mm" />
                <ResultCard label="Angle" value={result.outputs.stringerAngle} unit="°" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <ResultCard label="2R + G (Blondel)" value={result.outputs.walklineSum} unit="mm — comfort 550–700" />
              </div>
            </div>

            <StairDiagram
              riserCount={result.outputs.riserCount}
              riserHeight={result.outputs.riserHeight}
              treadDepth={result.outputs.treadDepth}
              stringerLength={result.outputs.stringerLength}
              totalRise={parseFloat(inputs.totalRise)}
              totalRun={
                inputs.totalRun && parseFloat(inputs.totalRun) > 0
                  ? parseFloat(inputs.totalRun)
                  : result.outputs.treadCount * result.outputs.treadDepth
              }
            />

            <ApprenticeWorking
              steps={stairsSteps}
              finalAnswer={`${result.outputs.riserCount} risers, ${result.outputs.treadCount} treads`}
              finalLabel="Stair layout"
              visible={settings.apprenticeMode}
              id="stairs"
              glossary={[
                { term: 'Riser', definition: 'The vertical face of each step — the bit your foot kicks. Height is measured from the top of one tread to the top of the next.' },
                { term: 'Tread / Going', definition: 'The horizontal part you walk on. "Going" is the depth of the tread, measured from nosing to nosing.' },
                { term: 'Stringer', definition: 'The sloped structural board on each side of the staircase that carries the treads and risers. Calculated using Pythagoras.' },
                { term: 'Flight', definition: 'A continuous run of stairs between two landings, or between floor and landing.' },
                { term: 'Nosing', definition: 'The front edge of a tread that projects beyond the riser face below it.' },
              ]}
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.stairs[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
