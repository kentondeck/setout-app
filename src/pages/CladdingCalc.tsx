import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { JobNameInput } from '../components/JobNameInput';
import { calculateCladding } from '../calculators/cladding';
import type { CladdingOutputs } from '../calculators/cladding';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { CoastalNote } from '../components/CoastalNote';

interface Inputs {
  wallHeight: string;
  wallWidth: string;
  boardWidth: string;
  lap: string;
  boardLength: string;
  startOffset: string;
}

const DEFAULTS: Inputs = {
  wallHeight: '',
  wallWidth: '',
  boardWidth: '180',
  lap: '30',
  boardLength: '4200',
  startOffset: '0',
};

export function CladdingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: CladdingOutputs; rodMarks: number[]; steps: WorkingStep[] } | null>(null);
  const [jobName, setJobName] = useState('');
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const wallHeight = parseFloat(inputs.wallHeight);
    const wallWidth = parseFloat(inputs.wallWidth);
    const boardWidth = parseFloat(inputs.boardWidth);
    const lap = parseFloat(inputs.lap);
    const boardLength = parseFloat(inputs.boardLength);
    const startOffset = parseFloat(inputs.startOffset) || 0;

    if (!wallHeight || wallHeight <= 0) { setError('Enter a wall height.'); return; }
    if (!wallWidth || wallWidth <= 0) { setError('Enter a wall width.'); return; }
    if (!boardWidth || boardWidth <= 0) { setError('Enter a board width.'); return; }
    if (!lap || lap <= 0 || lap >= boardWidth) { setError('Lap must be greater than 0 and less than board width.'); return; }
    if (!boardLength || boardLength <= 0) { setError('Enter a board length.'); return; }
    if (startOffset < 0) { setError('Start offset must be 0 or greater.'); return; }

    setError('');

    const calc = calculateCladding({ wallHeight, wallWidth, boardWidth, lap, boardLength, startOffset });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'cladding',
      timestamp: Date.now(),
      jobName: jobName || undefined,
      inputs: { wallHeight, wallWidth, boardWidth, lap, boardLength, startOffset },
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader
        title="Cladding"
      />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={cardStyle}>
          {/* Wall dimensions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Wall height" value={inputs.wallHeight} onChange={set('wallHeight')} units={['mm', 'm']} placeholder="2700" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Wall width" value={inputs.wallWidth} onChange={set('wallWidth')} units={['mm', 'm']} placeholder="5400" />
            </div>
          </div>

          {/* Board dimensions */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board width" value={inputs.boardWidth} onChange={set('boardWidth')} units={['mm', 'm']} placeholder="180" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Lap"
                value={inputs.lap}
                onChange={set('lap')}
                units={['mm', 'm']}
                placeholder="30"
                hint={inputs.boardWidth && inputs.lap ? `face ${Math.max(0, parseFloat(inputs.boardWidth) - parseFloat(inputs.lap))}mm` : undefined}
              />
            </div>
          </div>

          {/* Stock length & start offset */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board length" value={inputs.boardLength} onChange={set('boardLength')} units={['mm', 'm']} placeholder="4200" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Start offset" value={inputs.startOffset} onChange={set('startOffset')} units={['mm', 'm']} placeholder="0" hint="from datum to first course" />
            </div>
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
            {/* Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Courses" value={result.outputs.courseCount} accent />
                <ResultCard label="Face cover" value={result.outputs.faceCover} unit="mm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Boards" value={result.outputs.stockCount} unit={`@ ${inputs.boardLength}mm`} />
                <ResultCard label="Waste" value={result.outputs.wastePercent} unit="%" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Total lineal m" value={result.outputs.totalLm} unit="lm" />
                <ResultCard label="Top board rip" value={result.outputs.topBoardRip} unit="mm" />
              </div>
            </div>

            {/* Story rod */}
            <div style={{ ...cardStyle, gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                STORY ROD — {result.outputs.faceCover}mm centres · top board ripped to {result.outputs.topBoardRip}mm
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {result.rodMarks.map((mark, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--color-bg)', borderRadius: 8, padding: '7px 12px',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Course {i + 1}</span>
                    <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{mark}mm</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div style={{ ...cardStyle, gap: 14 }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS</p>
              {[
                { label: `Cladding boards (${inputs.boardLength}mm)`, qty: result.outputs.stockCount, detail: `${result.outputs.totalLm}lm` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.qty} boards · {row.detail}
                  </span>
                </div>
              ))}
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${result.outputs.courseCount} courses at ${result.outputs.faceCover}mm centres`}
              finalLabel="Cladding setout"
              visible={settings.apprenticeMode}
              id="cladding"
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />

            <CoastalNote />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.cladding[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
