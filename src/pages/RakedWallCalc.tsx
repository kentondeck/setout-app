import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateRakedWall } from '../calculators/raked-wall';
import type { RakedWallOutputs } from '../calculators/raked-wall';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { VoiceInputButton } from '../components/VoiceInputButton';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';

type InputMode = 'heights' | 'pitch';

interface Inputs {
  wallLength: string;
  lowHeight: string;
  highHeight: string;
  pitch: string;
  studSpacing: string;
  customSpacing: string;
  timberThickness: string;
}

const DEFAULTS: Inputs = {
  wallLength: '',
  lowHeight: '',
  highHeight: '',
  pitch: '',
  studSpacing: '450',
  customSpacing: '',
  timberThickness: '45',
};

export function RakedWallCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [mode, setMode] = useState<InputMode>('heights');
  const [result, setResult] = useState<{ outputs: RakedWallOutputs; studHeights: number[]; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  const resolvedSpacing = inputs.studSpacing === 'custom'
    ? parseFloat(inputs.customSpacing) || 450
    : parseFloat(inputs.studSpacing);

  // Preview derived high height when in pitch mode (wall length now in mm)
  const derivedHighHeight = mode === 'pitch' && inputs.wallLength && inputs.lowHeight && inputs.pitch
    ? Math.round(parseFloat(inputs.lowHeight) + Math.tan(parseFloat(inputs.pitch) * Math.PI / 180) * parseFloat(inputs.wallLength))
    : null;

  function handleCalculate() {
    const wallLength = parseFloat(inputs.wallLength);
    const lowHeight = parseFloat(inputs.lowHeight);
    const studSpacing = resolvedSpacing;

    if (!wallLength || wallLength <= 0) { setError('Enter a wall length.'); return; }
    if (!lowHeight || lowHeight <= 0) { setError('Enter the low end height.'); return; }

    let highHeight: number;
    if (mode === 'heights') {
      highHeight = parseFloat(inputs.highHeight);
      if (!highHeight || highHeight <= lowHeight) { setError('High end height must be greater than the low end height.'); return; }
    } else {
      const pitch = parseFloat(inputs.pitch);
      if (!pitch || pitch <= 0 || pitch >= 90) { setError('Enter a valid roof pitch (0–90°).'); return; }
      highHeight = Math.round(lowHeight + Math.tan(pitch * Math.PI / 180) * wallLength);
    }

    setError('');

    const timberThickness = parseFloat(inputs.timberThickness) || 45;
    const calc = calculateRakedWall({ wallLength, lowHeight, highHeight, studSpacing, timberThickness });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'raked',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { wallLength, lowHeight, highHeight, studSpacing, timberThickness },
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Raked Wall"
        right={
          <VoiceInputButton
            prompt="Say: wall length, low height, high height"
            onValues={values => setInputs(prev => ({
              ...prev,
              ...(values[0] !== undefined && { wallLength: String(values[0]) }),
              ...(values[1] !== undefined && { lowHeight: String(values[1]) }),
              ...(values[2] !== undefined && mode === 'heights' ? { highHeight: String(values[2]) } : { pitch: String(values[2]) }),
            }))}
          />
        }
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={cardStyle}>
          {/* Input mode toggle */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>INPUT METHOD</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={toggleStyle(mode === 'heights')} onClick={() => setMode('heights')}>Two heights</button>
              <button style={toggleStyle(mode === 'pitch')} onClick={() => setMode('pitch')}>Roof pitch</button>
            </div>
          </div>

          {/* Wall length */}
          <NumberInput label="Wall length" value={inputs.wallLength} onChange={set('wallLength')} unit="mm" placeholder="4000" />

          {/* Heights */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Low end height" value={inputs.lowHeight} onChange={set('lowHeight')} unit="mm" placeholder="2400" hint="floor to top of rake plate" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {mode === 'heights' ? (
                <NumberInput label="High end height" value={inputs.highHeight} onChange={set('highHeight')} unit="mm" placeholder="3200" hint="floor to top of rake plate" />
              ) : (
                <NumberInput
                  label="Roof pitch"
                  value={inputs.pitch}
                  onChange={set('pitch')}
                  unit="°"
                  placeholder="22.5"
                  hint={derivedHighHeight ? `high end ≈ ${derivedHighHeight}mm` : undefined}
                />
              )}
            </div>
          </div>

          {/* Stud spacing */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>STUD SPACING</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['450', '600', 'custom'] as const).map(sp => (
                <button key={sp} onClick={() => setInputs(prev => ({ ...prev, studSpacing: sp }))} style={toggleStyle(inputs.studSpacing === sp)}>
                  {sp === 'custom' ? 'Custom' : `${sp}mm`}
                </button>
              ))}
            </div>
            {inputs.studSpacing === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput label="" value={inputs.customSpacing} onChange={v => setInputs(prev => ({ ...prev, customSpacing: v }))} unit="mm" placeholder="300" />
              </div>
            )}
          </div>

          {/* Timber thickness */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>TIMBER THICKNESS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['35', '45', '70', '90', 'custom'] as const).map(t => (
                <button key={t} onClick={() => setInputs(prev => ({ ...prev, timberThickness: t === 'custom' ? '' : t }))} style={toggleStyle(t === 'custom' ? !['35','45','70','90'].includes(inputs.timberThickness) : inputs.timberThickness === t)}>
                  {t === 'custom' ? 'Custom' : `${t}mm`}
                </button>
              ))}
            </div>
            {!['35', '45', '70', '90'].includes(inputs.timberThickness) && (
              <div style={{ marginTop: 10 }}>
                <NumberInput label="" value={inputs.timberThickness} onChange={v => setInputs(prev => ({ ...prev, timberThickness: v }))} unit="mm" placeholder="e.g. 42" />
              </div>
            )}
          </div>
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
            {/* Summary results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Studs" value={result.outputs.studCount} accent />
                <ResultCard label="Total lineal m" value={result.outputs.totalLinealMetres} unit="lm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Rake plate" value={result.outputs.rakePlateLength} unit="mm" />
                <ResultCard label="Pitch angle" value={result.outputs.pitchAngle} unit="°" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Low stud" value={result.outputs.lowStudHeight} unit="mm" />
                <ResultCard label="High stud" value={result.outputs.highStudHeight} unit="mm" />
              </div>
            </div>

            {/* Stud cut list */}
            <div style={{ ...cardStyle, gap: 12 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                  STUD LENGTHS — short side of top cut
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>
                  Cut top at {result.outputs.pitchAngle}° · add {result.outputs.studCutExtra}mm on high side · deducted {parseFloat(inputs.timberThickness) || 45}mm bottom plate + {result.outputs.rakePlateVertical}mm rake plate
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.studHeights.map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--color-bg)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Stud {i + 1}</span>
                    <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{h}mm</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '0.5px solid var(--color-border)' }}>
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Total</span>
                <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>{result.outputs.totalStudLineal}lm</span>
              </div>
            </div>

            {/* Materials */}
            <div style={{ ...cardStyle, gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS</p>
              {[
                { label: `Studs (varying heights)`, qty: result.outputs.studCount, detail: `${result.outputs.lowStudHeight}–${result.outputs.highStudHeight}mm` },
                { label: 'Rake plate', qty: 1, detail: `${result.outputs.rakePlateLength}mm` },
                { label: 'Bottom plate', qty: 1, detail: `${Math.round(result.outputs.bottomPlateLineal * 1000)}mm` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.qty > 1 ? `${row.qty} × ` : ''}{row.detail}
                  </span>
                </div>
              ))}
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${result.outputs.studCount} studs, ${result.outputs.pitchAngle}° pitch`}
              finalLabel="Raked wall layout"
              visible={settings.apprenticeMode}
              id="raked"
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.raked[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
