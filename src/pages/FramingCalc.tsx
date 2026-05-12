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
  customSpacing: string;
  nogginRows: string;
}

const DEFAULTS: Inputs = {
  wallLength: '',
  wallHeight: '2.4',
  studSpacing: '450',
  customSpacing: '',
  nogginRows: '1',
};

export function FramingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [includeNoggins, setIncludeNoggins] = useState(true);
  const [doubleStuds, setDoubleStuds] = useState(false);
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
    const studSpacing = inputs.studSpacing === 'custom'
      ? parseFloat(inputs.customSpacing)
      : parseFloat(inputs.studSpacing);
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

    const calc = calculateFraming({ wallLength, wallHeight, studSpacing, includeNoggins, nogginRows: nogginRows || 1, doubleStuds });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'framing',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { wallLength, wallHeight, studSpacing, nogginRows, includeNoggins: includeNoggins ? 1 : 0, doubleStuds: doubleStuds ? 1 : 0 },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  // Build new-format working steps from actual calculator outputs
  const wallLengthMm = result ? Math.round(parseFloat(inputs.wallLength) * 1000) : 0;
  const studSpacingMm = result ? parseFloat(inputs.studSpacing) : 0;
  const studsBefore = result ? result.outputs.studCount - 1 : 0;

  const framingSteps: WorkingStep[] = result ? [
    {
      label: 'Wall length',
      explanation: "The full length of the wall you're framing",
      result: `${wallLengthMm} mm`,
    },
    {
      label: 'Stud spacing',
      explanation: 'How far apart each stud goes, centre to centre',
      result: `${studSpacingMm} mm apart`,
    },
    {
      label: 'Studs in the span',
      explanation: 'Divide the wall length by the stud spacing',
      calculation: `${wallLengthMm} ÷ ${studSpacingMm} = ${(wallLengthMm / studSpacingMm).toFixed(1)}`,
      result: `Round up to ${studsBefore} studs`,
    },
    {
      label: 'Add the end stud',
      explanation: "One extra stud at the end of the wall so you have something to fix the sheet to",
      calculation: `${studsBefore} + 1`,
      result: `${result.outputs.studCount} studs`,
    },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Wall Framing"
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
              {(['450', '600', 'custom'] as const).map(sp => (
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
                  {sp === 'custom' ? 'Custom' : `${sp}mm`}
                </button>
              ))}
            </div>
            {inputs.studSpacing === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={inputs.customSpacing}
                  onChange={v => setInputs(prev => ({ ...prev, customSpacing: v }))}
                  unit="mm"
                  placeholder="e.g. 300"
                />
              </div>
            )}
          </div>

          {/* Double studs toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Double studs</span>
            <button
              onClick={() => setDoubleStuds(v => !v)}
              style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                border: 'none',
                background: doubleStuds ? 'var(--color-orange)' : '#ccc',
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
                  left: doubleStuds ? 21 : 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Noggins toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Include nogs</span>
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
                <NumberInput label="Nog rows" value={inputs.nogginRows} onChange={set('nogginRows')} unit="" placeholder="1" hint="rows per stud bay" />
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
                <ResultCard label="Nogs" value={result.outputs.nogginCount} />
              )}
            </div>

            <ApprenticeWorking
              steps={framingSteps}
              finalAnswer={`${result.outputs.studCount} studs`}
              finalLabel="Total studs needed"
              visible={settings.apprenticeMode}
              id="framing"
            />

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
