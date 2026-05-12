import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateFraming } from '../calculators/framing';
import type { FramingOutputs } from '../calculators/framing';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../App';

interface Inputs {
  wallLength: string;
  wallHeight: string;
  studSpacing: string;
  nogginRows: string;
}

const DEFAULTS: Inputs = {
  wallLength: '',
  wallHeight: '2.4',
  studSpacing: '450',
  nogginRows: '1',
};

export function FramingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [includeNoggins, setIncludeNoggins] = useState(true);
  const [result, setResult] = useState<{ outputs: FramingOutputs; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const wallLength = parseFloat(inputs.wallLength);
    const wallHeight = parseFloat(inputs.wallHeight);
    const studSpacing = parseFloat(inputs.studSpacing);
    const nogginRows = parseInt(inputs.nogginRows);

    if (!wallLength || wallLength <= 0) {
      setError('Enter a wall length to calculate.');
      return;
    }
    if (!wallHeight || wallHeight <= 0) {
      setError('Enter a valid wall height.');
      return;
    }

    setError('');

    const calc = calculateFraming({ wallLength, wallHeight, studSpacing, includeNoggins, nogginRows: nogginRows || 1 });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'framing',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { wallLength, wallHeight, studSpacing, nogginRows, includeNoggins: includeNoggins ? 1 : 0 },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Framing"
        right={
          <VoiceInputButton
            prompt="Say: wall length, wall height, stud spacing"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { wallLength: String(values[0]) }),
              ...(values[1] !== undefined && { wallHeight: String(values[1]) }),
              ...(values[2] !== undefined && { studSpacing: String(values[2]) }),
            }))}
          />
        }
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Inputs */}
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
              <NumberInput label="Wall length" value={inputs.wallLength} onChange={set('wallLength')} unit="m" placeholder="e.g. 6.0" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Wall height" value={inputs.wallHeight} onChange={set('wallHeight')} unit="m" placeholder="2.4" />
            </div>
          </div>

          {/* Stud spacing toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
              STUD SPACING
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['450', '600'] as const).map(sp => (
                <button
                  key={sp}
                  onClick={() => setInputs(prev => ({ ...prev, studSpacing: sp }))}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '0.5px solid var(--color-border)',
                    background: inputs.studSpacing === sp ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: inputs.studSpacing === sp ? '#fff' : 'var(--color-text)',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {sp}mm
                </button>
              ))}
            </div>
          </div>

          {/* Noggins toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Include noggins</span>
            <button
              onClick={() => setIncludeNoggins(v => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: includeNoggins ? 'var(--color-orange)' : '#ccc',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: includeNoggins ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {includeNoggins && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput label="Noggin rows" value={inputs.nogginRows} onChange={set('nogginRows')} unit="" placeholder="1" hint="rows per stud bay" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }} />
            </div>
          )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Studs" value={result.outputs.studCount} accent />
                <ResultCard label="Total lineal m" value={result.outputs.totalLinealMetres} unit="lm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Top plate" value={result.outputs.topPlateLineal} unit="lm" />
                <ResultCard label="Bottom plate" value={result.outputs.bottomPlateLineal} unit="lm" />
              </div>
              {includeNoggins && (
                <ResultCard label="Noggins" value={result.outputs.nogginCount} />
              )}
            </div>

            {settings.apprenticeMode && (
              <ApprenticeWorking
                steps={result.steps}
                why="Getting your framing quantities right before you start means one trip to the yard. Stud count drives everything — get that wrong and your plates and noggins are off too. The double top plate is often forgotten until you're at the counter."
              />
            )}

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.framing[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
