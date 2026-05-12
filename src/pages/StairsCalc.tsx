import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateStairs } from '../calculators/stairs';
import type { StairsOutputs } from '../calculators/stairs';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES, STAIR_LIMITS } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../App';

interface Inputs {
  totalRise: string;
  totalRun: string;
  preferredRiser: string;
}

const DEFAULTS: Inputs = {
  totalRise: '',
  totalRun: '',
  preferredRiser: '175',
};

export function StairsCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: StairsOutputs; steps: WorkingStep[]; warnings: { riserOutOfRange: boolean; treadOutOfRange: boolean } } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const totalRise = parseFloat(inputs.totalRise);
    const totalRun = parseFloat(inputs.totalRun);
    const preferredRiser = parseFloat(inputs.preferredRiser);

    if (!totalRise || totalRise <= 0) {
      setError('Enter a total rise to calculate.');
      return;
    }
    if (!totalRun || totalRun <= 0) {
      setError('Enter a total run to calculate.');
      return;
    }
    if (!preferredRiser || preferredRiser <= 0) {
      setError('Enter a preferred riser height.');
      return;
    }

    setError('');

    const limits = STAIR_LIMITS[settings.region];
    const calc = calculateStairs({ totalRise, totalRun, preferredRiser, limits });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'stairs',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { totalRise, totalRun, preferredRiser },
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
        right={
          <VoiceInputButton
            prompt="Say: total rise, total run, riser height"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { totalRise: String(values[0]) }),
              ...(values[1] !== undefined && { totalRun: String(values[1]) }),
              ...(values[2] !== undefined && { preferredRiser: String(values[2]) }),
            }))}
          />
        }
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
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Total rise" value={inputs.totalRise} onChange={set('totalRise')} unit="mm" placeholder="e.g. 2700" hint="floor to floor" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Total run" value={inputs.totalRun} onChange={set('totalRun')} unit="mm" placeholder="e.g. 3500" hint="horizontal space" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred riser" value={inputs.preferredRiser} onChange={set('preferredRiser')} unit="mm" placeholder="175" hint={`${STAIR_LIMITS[settings.region].riserMin}–${STAIR_LIMITS[settings.region].riserMax}mm`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }} />
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
            {/* Compliance warnings */}
            {(result.warnings.riserOutOfRange || result.warnings.treadOutOfRange) && (
              <div
                style={{
                  background: '#fff8e1',
                  border: '0.5px solid #f59e0b',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#92400e' }}>
                  Compliance check — {STAIR_LIMITS[settings.region].standard}
                </p>
                {result.warnings.riserOutOfRange && (
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                    Riser {result.outputs.riserHeight}mm is outside the allowed range ({STAIR_LIMITS[settings.region].riserMin}–{STAIR_LIMITS[settings.region].riserMax}mm)
                  </p>
                )}
                {result.warnings.treadOutOfRange && (
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                    Tread {result.outputs.treadDepth}mm is outside the allowed range ({STAIR_LIMITS[settings.region].treadMin}–{STAIR_LIMITS[settings.region].treadMax}mm)
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
            </div>

            <ApprenticeWorking
              steps={stairsSteps}
              finalAnswer={`${result.outputs.riserCount} risers, ${result.outputs.treadCount} treads`}
              finalLabel="Stair layout"
              visible={settings.apprenticeMode}
              id="stairs"
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.stairs[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
