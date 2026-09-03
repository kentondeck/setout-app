import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { calculateStairs } from '../calculators/stairs';
import type { StairsOutputs, StairsWarnings } from '../calculators/stairs';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES, STAIR_LIMITS } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { StairDiagram } from '../components/StairDiagram';
import { useScrollToResult } from '../lib/useScrollToResult';
import { JobNameInput } from '../components/JobNameInput';

interface Inputs {
  totalRise: string;
  totalRun: string;
  preferredRiser: string;
  preferredGoing: string;
  nosing: string;
  treadThickness: string;
}

const DEFAULTS: Inputs = {
  totalRise: '',
  totalRun: '',
  preferredRiser: '',
  preferredGoing: '',
  nosing: '',
  treadThickness: '',
};

export function StairsCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: StairsOutputs; steps: WorkingStep[]; warnings: StairsWarnings } | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const totalRise = parseFloat(inputs.totalRise);
    const totalRun = parseFloat(inputs.totalRun);
    const preferredRiser = parseFloat(inputs.preferredRiser);
    const preferredGoing = inputs.preferredGoing ? parseFloat(inputs.preferredGoing) : undefined;
    const nosing = inputs.nosing ? parseFloat(inputs.nosing) : undefined;
    const treadThickness = inputs.treadThickness ? parseFloat(inputs.treadThickness) : undefined;

    if (!totalRise || totalRise <= 0) {
      setError('Enter a total rise to calculate.');
      return;
    }
    if ((!totalRun || totalRun <= 0) && !preferredGoing) {
      setError('Enter a total run, or set a preferred going to calculate the run.');
      return;
    }
    setError('');

    const limits = STAIR_LIMITS[settings.region];
    const calc = calculateStairs({
      totalRise,
      ...(totalRun && totalRun > 0 ? { totalRun } : {}),
      ...(preferredRiser && preferredRiser > 0 ? { preferredRiser } : {}),
      preferredGoing,
      ...(nosing && nosing > 0 ? { nosing } : {}),
      ...(treadThickness && treadThickness > 0 ? { treadThickness } : {}),
      limits,
    });
    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'stairs',
      timestamp: Date.now(),
      inputs: { totalRise, totalRun, preferredRiser, ...(preferredGoing ? { preferredGoing } : {}), ...(nosing ? { nosing } : {}), ...(treadThickness ? { treadThickness } : {}) },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  const stairRise = result ? parseFloat(inputs.totalRise) : 0;
  const stairPrefRiser = result
    ? (inputs.preferredRiser && parseFloat(inputs.preferredRiser) > 0
        ? parseFloat(inputs.preferredRiser)
        : Math.round((STAIR_LIMITS[settings.region].riserMin + STAIR_LIMITS[settings.region].riserMax) / 2))
    : 0;

  const stairsSteps: WorkingStep[] = result ? [
    { label: 'Total rise', explanation: 'The full height from floor to floor', result: `${stairRise} mm` },
    { label: 'Risers needed', explanation: 'Divide the rise by your preferred riser height', calculation: `${stairRise} ÷ ${stairPrefRiser} = ${(stairRise / stairPrefRiser).toFixed(1)}`, result: `Round to ${result.outputs.riserCount} risers` },
    { label: 'Actual riser height', explanation: 'Divide the total rise by the number of risers for the real value', calculation: `${stairRise} ÷ ${result.outputs.riserCount}`, result: `${result.outputs.riserHeight} mm each` },
    { label: 'Treads', explanation: 'Always one less tread than risers', calculation: `${result.outputs.riserCount} - 1`, result: `${result.outputs.treadCount} treads` },
    ...(result.outputs.treadBoardDepth > result.outputs.treadDepth ? [{
      label: 'Tread board depth',
      explanation: 'The going is measured nosing-to-nosing — the board itself has to run past the riser below it by the nosing overhang',
      calculation: `${result.outputs.treadDepth} + ${inputs.nosing}`,
      result: `${result.outputs.treadBoardDepth} mm — the depth to cut/order`,
    }] : []),
    ...(result.outputs.stringerDrop > 0 ? [{
      label: 'Stringer drop (bottom cut)',
      explanation: 'Every tread board sits on top of its notch, raising that step by the board thickness — except the bottom one. Drop the bottom cut by the same amount so the first step matches the rest',
      result: `${result.outputs.stringerDrop} mm off the bottom of the stringer`,
    }] : []),
    {
      label: 'Stringer length',
      explanation: result.outputs.stringerDrop > 0
        ? 'Pythagoras on rise and run, plus the extra length the bottom drop adds along the slope (drop ÷ sin(angle))'
        : 'Pythagoras — the straight-line length from the foot of the stringer to the top',
      result: `${result.outputs.stringerLength} mm`,
    },
    {
      label: 'Ordering stock',
      explanation: "The theoretical length above is the pitch line only — actual end cuts (top and bottom) eat into the board, so order a bit longer",
      result: `${result.outputs.stringerLength}mm + 50–100mm allowance`,
    },
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
              <NumberInput label="Total run" value={inputs.totalRun} onChange={set('totalRun')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 3500', m: 'e.g. 3.5' }} hint="optional · leave blank to calculate" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred riser" value={inputs.preferredRiser} onChange={set('preferredRiser')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 175', m: 'e.g. 0.175' }} hint={`optional · ${STAIR_LIMITS[settings.region].riserMin}–${STAIR_LIMITS[settings.region].riserMax}mm`} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Preferred going" value={inputs.preferredGoing} onChange={set('preferredGoing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 250', m: 'e.g. 0.25' }} hint={`optional · ${STAIR_LIMITS[settings.region].treadMin}–${STAIR_LIMITS[settings.region].treadMax}mm`} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Nosing" value={inputs.nosing} onChange={set('nosing')} unit="mm" placeholder="e.g. 20" hint="optional · tread overhang past the riser" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Tread thickness" value={inputs.treadThickness} onChange={set('treadThickness')} unit="mm" placeholder="e.g. 32" hint="optional · for the bottom stringer drop" />
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
          <div ref={resultRef}>
            {/* Auto riser callout */}
            {result.warnings.riserAutoSelected && (
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: '12px 14px',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                  Riser height auto-calculated — targeting <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{Math.round((STAIR_LIMITS[settings.region].riserMin + STAIR_LIMITS[settings.region].riserMax) / 2)}mm</span> midpoint of allowed range
                </p>
              </div>
            )}

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
                <ResultCard label="Tread depth (going)" value={result.outputs.treadDepth} unit="mm" />
              </div>
              {(result.outputs.treadBoardDepth > result.outputs.treadDepth || result.outputs.stringerDrop > 0) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {result.outputs.treadBoardDepth > result.outputs.treadDepth
                    ? <ResultCard label="Tread board depth" value={result.outputs.treadBoardDepth} unit="mm" accent />
                    : <div />}
                  {result.outputs.stringerDrop > 0
                    ? <ResultCard label="Stringer drop" value={result.outputs.stringerDrop} unit="mm" accent />
                    : <div />}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Stringer" value={result.outputs.stringerLength} unit="mm" />
                <ResultCard label="Angle" value={result.outputs.stringerAngle} unit="°" />
              </div>
              <p style={{ margin: '2px 4px 0', fontSize: 11, color: 'var(--color-muted)' }}>
                Pitch-line length{result.outputs.stringerDrop > 0 ? ', including the bottom drop' : ''} — order +50–100mm on top for the top/bottom end cuts
              </p>
            </div>

            <StairDiagram
              riserCount={result.outputs.riserCount}
              riserHeight={result.outputs.riserHeight}
              treadDepth={result.outputs.treadDepth}
              stringerLength={result.outputs.stringerLength}
              totalRise={result.outputs.totalRise}
              totalRun={result.outputs.totalRun}
              nosing={result.outputs.treadBoardDepth - result.outputs.treadDepth}
              label={jobName}
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
                { term: 'Nosing', definition: 'The front edge of a tread that projects beyond the riser face below it. Adds to the board depth you need to cut/order beyond the going.' },
                { term: 'Stringer drop', definition: 'How much to lower the bottom stringer cut so the first step ends up the same height as the rest once the tread board is sitting on it.' },
              ]}
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
            <AddToJobPrompt calculationId={lastEntryId} />
            <ShareCalcButton calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.stairs[settings.region]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
