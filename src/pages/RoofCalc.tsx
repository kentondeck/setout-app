import { useState, useContext, useEffect, useRef } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateRoof, RoofInputError } from '../calculators/roof';
import type { RoofOutputs } from '../calculators/roof';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { RoofDiagram } from '../components/RoofDiagram';

interface Inputs {
  span: string;
  rise: string;
  rafterLength: string;
  pitchDegrees: string;
  overhang: string;
  rafterDepth: string;
  plateWidth: string;
  ridgeThickness: string;
}

const DEFAULTS: Inputs = {
  span: '',
  rise: '',
  rafterLength: '',
  pitchDegrees: '',
  overhang: '',
  rafterDepth: '',
  plateWidth: '',
  ridgeThickness: '',
};

const parseOpt = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function RoofCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: RoofOutputs; steps: WorkingStep[] } | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  // Track which 4 main fields the user actually typed in, so derived values
  // can be displayed differently without polluting the inputs.
  const userEntered = useRef<Set<keyof Inputs>>(new Set());

  function set(field: keyof Inputs) {
    return (value: string) => {
      if (value.trim()) userEntered.current.add(field); else userEntered.current.delete(field);
      // A new edit invalidates the saved-history-entry link
      setLastEntryId('');
      setInputs(prev => ({ ...prev, [field]: value }));
    };
  }

  // Live calc — recompute whenever inputs change
  useEffect(() => {
    const span = parseOpt(inputs.span);
    const rise = parseOpt(inputs.rise);
    const rafterLength = parseOpt(inputs.rafterLength);
    const pitchDegrees = parseOpt(inputs.pitchDegrees);
    const filled = [span, rise, rafterLength, pitchDegrees].filter(v => v !== undefined).length;

    if (filled < 2) {
      setResult(null);
      setError('');
      return;
    }

    try {
      const calc = calculateRoof({
        span, rise, rafterLength, pitchDegrees,
        overhang: parseOpt(inputs.overhang) ?? 0,
        rafterDepth: parseOpt(inputs.rafterDepth),
        plateWidth: parseOpt(inputs.plateWidth),
        ridgeThickness: parseOpt(inputs.ridgeThickness),
      });
      setResult(calc);
      setError('');
    } catch (e) {
      setResult(null);
      setError(e instanceof RoofInputError ? e.message : 'Could not calculate — check inputs.');
    }
  }, [inputs]);

  function handleSave() {
    if (!result) return;
    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'roof',
      timestamp: Date.now(),
      inputs: {
        span: result.outputs.span,
        rise: result.outputs.rise,
        rafterLength: result.outputs.rafterLength,
        pitchDegrees: result.outputs.pitchDegrees,
        overhang: parseOpt(inputs.overhang) ?? 0,
        ...(parseOpt(inputs.rafterDepth) !== undefined && { rafterDepth: parseOpt(inputs.rafterDepth)! }),
        ...(parseOpt(inputs.plateWidth) !== undefined && { plateWidth: parseOpt(inputs.plateWidth)! }),
        ...(parseOpt(inputs.ridgeThickness) !== undefined && { ridgeThickness: parseOpt(inputs.ridgeThickness)! }),
      },
      outputs: result.outputs,
    });
    if (navigator.vibrate) navigator.vibrate(30);
  }

  const out = result?.outputs;
  const roofPitch = out?.pitchDegrees ?? 0;
  const roofRunMm = out ? Math.round(out.run * 1000) : 0;
  const roofRidgeMm = out ? Math.round(out.ridgeHeight * 1000) : 0;
  const roofRafterMm = out ? Math.round(out.totalRafterLength * 1000) : 0;

  const roofSteps: WorkingStep[] = result ? [
    { label: 'Run', explanation: 'The horizontal distance from the wall to the ridge', result: `${roofRunMm} mm` },
    { label: 'Pitch', explanation: 'The angle of the roof from horizontal', result: `${roofPitch}°` },
    { label: 'Ridge height', explanation: 'The run times the tangent of the pitch angle gives you the rise', calculation: `${roofRunMm} × tan(${roofPitch}°) = ${roofRidgeMm}`, result: `${roofRidgeMm} mm rise` },
    { label: 'Rafter length', explanation: 'The run divided by the cosine of the pitch gives the rafter length', calculation: `${roofRunMm} ÷ cos(${roofPitch}°) = ${roofRafterMm}`, result: `${roofRafterMm} mm rafter` },
  ] : [];

  // Helper: derived chip for the live summary
  function ValueChip({ label, value, unit, derived }: { label: string; value: string; unit: string; derived: boolean }) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '8px 12px',
        background: derived ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
        border: `0.5px solid ${derived ? 'rgba(255,90,31,0.3)' : 'var(--color-border)'}`,
        borderRadius: 10,
      }}>
        <span style={{ fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
          {value}<span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Roof pitch" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Single inputs card — main triangle inputs + optional rafter cuts under a divider */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            ENTER ANY 2 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— span, rise, rafter length or pitch</span>
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Span" value={inputs.span} onChange={set('span')} units={['m', 'mm']} placeholder="" hint="full width" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Rise" value={inputs.rise} onChange={set('rise')} units={['m', 'mm']} placeholder="" hint="ridge height" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label="Rafter length"
                value={inputs.rafterLength}
                onChange={set('rafterLength')}
                units={['m', 'mm']}
                placeholder=""
                hint={parseOpt(inputs.ridgeThickness) ? 'cut, to ridge face' : 'to centreline'}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Pitch" value={inputs.pitchDegrees} onChange={set('pitchDegrees')} unit="°" placeholder="" hint="degrees" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Ridge thickness" value={inputs.ridgeThickness} onChange={set('ridgeThickness')} units={['mm', 'm']} placeholder="" hint="for cut length" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Eaves overhang" value={inputs.overhang} onChange={set('overhang')} units={['m', 'mm']} placeholder="" hint="each side (optional)" />
            </div>
          </div>

          <div style={{ height: 0.5, background: 'var(--color-border)', margin: '4px -16px' }} />

          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            BIRDSMOUTH <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Rafter depth" value={inputs.rafterDepth} onChange={set('rafterDepth')} units={['mm', 'm']} placeholder="" hint="timber size" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Plate width" value={inputs.plateWidth} onChange={set('plateWidth')} units={['mm', 'm']} placeholder="" hint="seat width" />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>
        )}

        {result && out && (
          <>
            {/* Diagram — moved to the top, visual focus */}
            <RoofDiagram
              buildingWidthMm={out.span * 1000}
              pitchDegrees={out.pitchDegrees}
              ridgeHeightMm={out.ridgeHeight * 1000}
              rafterLengthMm={Math.round(out.totalRafterLength * 1000)}
              overhangMm={parseOpt(inputs.overhang) ? parseOpt(inputs.overhang)! * 1000 : 0}
            />

            {/* Live summary: all 4 triangle values + cut angles. Derived ones tinted. */}
            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <ValueChip label="Span"   value={String(out.span)}         unit="m" derived={!userEntered.current.has('span')} />
                <ValueChip label="Rise"   value={String(out.rise)}         unit="m" derived={!userEntered.current.has('rise')} />
                <ValueChip label="Rafter" value={String(out.rafterLength)} unit="m" derived={!userEntered.current.has('rafterLength')} />
                <ValueChip label="Pitch"  value={String(out.pitchDegrees)} unit="°" derived={!userEntered.current.has('pitchDegrees')} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <ResultCard label="Plumb cut" value={out.plumbCutAngle} unit="°" />
                <ResultCard label="Seat cut" value={out.seatCutAngle} unit="°" />
              </div>
              {parseOpt(inputs.overhang) && (
                <p style={{ margin: '2px 4px 0', fontSize: 12, color: 'var(--color-muted)' }}>
                  Total rafter with overhang: <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{out.totalRafterLength}m</span>
                </p>
              )}
            </div>

            {/* Rafter cut details — only when optional inputs were provided */}
            {(out.birdsmouthPlumbDepth > 0 || out.ridgeShortening > 0) && (
              <div
                style={{
                  background: 'var(--color-card)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>RAFTER CUT DETAILS</p>
                {out.birdsmouthPlumbDepth > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Birdsmouth</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Seat width" value={parseOpt(inputs.plateWidth) ?? 0} unit="mm" />
                      <ResultCard label="Plumb depth" value={out.birdsmouthPlumbDepth} unit="mm" />
                    </div>
                    {out.remainingDepth > 0 && (
                      <div
                        style={{
                          background: out.remainingDepth < out.birdsmouthPlumbDepth * 0.5
                            ? '#fff7ed'
                            : 'var(--color-bg)',
                          border: `0.5px solid ${out.remainingDepth < out.birdsmouthPlumbDepth * 0.5 ? '#fbbf24' : 'var(--color-border)'}`,
                          borderRadius: 8,
                          padding: '7px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Remaining depth</span>
                        <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: out.remainingDepth < out.birdsmouthPlumbDepth * 0.5 ? '#92400e' : 'var(--color-text)' }}>
                          {out.remainingDepth}mm
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {out.ridgeShortening > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Ridge</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Line length" value={Math.round(out.rafterLength * 1000)} unit="mm" />
                      <ResultCard label="Shorten by" value={out.ridgeShortening} unit="mm" />
                    </div>
                    <div
                      style={{
                        background: 'var(--color-bg)',
                        border: '0.5px solid var(--color-border)',
                        borderRadius: 8,
                        padding: '7px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Net rafter (seat → ridge face)</span>
                      <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>
                        {out.netRafterLengthMm}mm
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ApprenticeWorking
              steps={roofSteps}
              finalAnswer={`${roofRafterMm}mm`}
              finalLabel="Common rafter length"
              visible={settings.apprenticeMode}
              id="roof"
            />

            {!lastEntryId ? (
              <button
                onClick={handleSave}
                style={{
                  background: 'var(--color-orange)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: '-0.3px',
                }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Save calculation
              </button>
            ) : (
              <AddToJobPrompt calculationId={lastEntryId} />
            )}

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.roof[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
