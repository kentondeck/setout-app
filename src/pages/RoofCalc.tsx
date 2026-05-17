import { useState, useContext } from 'react';
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

type PairKey = 'span' | 'rise' | 'rafterLength' | 'pitchDegrees';
type Mode = 'span-pitch' | 'span-rise' | 'rise-pitch' | 'rafter-pitch';
type RoofType = 'gabled' | 'skillion';

const MODES: { id: Mode; fields: [PairKey, PairKey] }[] = [
  { id: 'span-pitch',   fields: ['span', 'pitchDegrees'] },
  { id: 'span-rise',    fields: ['span', 'rise'] },
  { id: 'rise-pitch',   fields: ['rise', 'pitchDegrees'] },
  { id: 'rafter-pitch', fields: ['rafterLength', 'pitchDegrees'] },
];

function getModeLabel(id: Mode, roofType: RoofType): string {
  if (id === 'span-pitch')   return roofType === 'skillion' ? 'Run + Pitch'   : 'Span + Pitch';
  if (id === 'span-rise')    return roofType === 'skillion' ? 'Run + Rise'    : 'Span + Rise';
  if (id === 'rise-pitch')   return 'Rise + Pitch';
  return 'Rafter + Pitch';
}

const FIELD_META: Record<PairKey, { label: string; units: ['m', 'mm'] | ['mm', 'm'] | null; unit?: string; hintNoRidge: string; hintWithRidge?: string }> = {
  span:         { label: 'Span',          units: ['m', 'mm'], hintNoRidge: 'full width' },
  rise:         { label: 'Rise',          units: ['m', 'mm'], hintNoRidge: 'ridge height' },
  rafterLength: { label: 'Rafter length', units: ['m', 'mm'], hintNoRidge: 'to ridge centreline', hintWithRidge: 'cut length, to ridge face' },
  pitchDegrees: { label: 'Pitch',         units: null, unit: '°', hintNoRidge: 'degrees' },
};

interface Inputs {
  span: string;
  rise: string;
  rafterLength: string;
  pitchDegrees: string;
  overhang: string;
  ridgeThickness: string;
  rafterDepth: string;
  plateWidth: string;
}

const DEFAULTS: Inputs = {
  span: '', rise: '', rafterLength: '', pitchDegrees: '',
  overhang: '', ridgeThickness: '', rafterDepth: '', plateWidth: '',
};

const parseOpt = (s: string): number | undefined => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function RoofCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [roofType, setRoofType] = useState<RoofType>('gabled');
  const [mode, setMode] = useState<Mode>('span-pitch');
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<{ outputs: RoofOutputs; steps: WorkingStep[] } | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  const activeFields = MODES.find(m => m.id === mode)!.fields;

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const [aKey, bKey] = activeFields;
    const a = parseOpt(inputs[aKey]);
    const b = parseOpt(inputs[bKey]);
    if (a === undefined || b === undefined) {
      setError(`Enter ${FIELD_META[aKey].label.toLowerCase()} and ${FIELD_META[bKey].label.toLowerCase()}.`);
      return;
    }
    try {
      const calc = calculateRoof({
        [aKey]: a,
        [bKey]: b,
        overhang: parseOpt(inputs.overhang) ?? 0,
        rafterDepth: parseOpt(inputs.rafterDepth),
        plateWidth: parseOpt(inputs.plateWidth),
        ridgeThickness: roofType === 'skillion' ? undefined : parseOpt(inputs.ridgeThickness),
        skillion: roofType === 'skillion',
      });
      setResult(calc);
      setError('');

      const id = crypto.randomUUID();
      setLastEntryId(id);
      addEntry({
        id,
        calculatorId: 'roof',
        timestamp: Date.now(),
        inputs: {
          span: calc.outputs.span,
          rise: calc.outputs.rise,
          rafterLength: calc.outputs.rafterLength,
          pitchDegrees: calc.outputs.pitchDegrees,
          overhang: parseOpt(inputs.overhang) ?? 0,
          ...(parseOpt(inputs.rafterDepth) !== undefined && { rafterDepth: parseOpt(inputs.rafterDepth)! }),
          ...(parseOpt(inputs.plateWidth) !== undefined && { plateWidth: parseOpt(inputs.plateWidth)! }),
          ...(parseOpt(inputs.ridgeThickness) !== undefined && { ridgeThickness: parseOpt(inputs.ridgeThickness)! }),
        },
        outputs: calc.outputs,
      });

      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {
      setResult(null);
      setError(e instanceof RoofInputError ? e.message : 'Could not calculate — check inputs.');
    }
  }

  const out = result?.outputs;
  const hasRidge = !!parseOpt(inputs.ridgeThickness);
  const roofRunMm = out ? Math.round(out.run * 1000) : 0;
  const roofRidgeMm = out ? Math.round(out.ridgeHeight * 1000) : 0;
  const roofRafterMm = out ? Math.round(out.totalRafterLength * 1000) : 0;
  const roofPitch = out?.pitchDegrees ?? 0;

  const roofSteps: WorkingStep[] = result ? [
    { label: 'Run', explanation: 'Horizontal distance from wall to ridge centreline', result: `${roofRunMm} mm` },
    { label: 'Pitch', explanation: 'Angle of the roof from horizontal', result: `${roofPitch}°` },
    { label: 'Ridge height', explanation: 'run × tan(pitch)', calculation: `${roofRunMm} × tan(${roofPitch}°) = ${roofRidgeMm}`, result: `${roofRidgeMm} mm rise` },
    { label: hasRidge ? 'Cut rafter (to ridge face)' : 'Rafter length', explanation: hasRidge ? 'Line length minus the ridge shortening' : 'run ÷ cos(pitch)', calculation: hasRidge ? `${Math.round(out!.lineRafterLength * 1000)} − ${out!.ridgeShortening} = ${Math.round(out!.rafterLength * 1000)}` : `${roofRunMm} ÷ cos(${roofPitch}°) = ${Math.round(out!.rafterLength * 1000)}`, result: `${Math.round(out!.rafterLength * 1000)} mm` },
  ] : [];

  function RafterDimChip({ label, value, unit }: { label: string; value: string; unit: string }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 12px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10 }}>
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

        {/* Roof type toggle — Gabled vs Skillion */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['gabled', 'skillion'] as RoofType[]).map(rt => {
            const active = roofType === rt;
            return (
              <button
                key={rt}
                onClick={() => { setRoofType(rt); setResult(null); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                  background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                  color: active ? 'var(--color-orange)' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: '-0.2px',
                  textTransform: 'capitalize',
                }}
              >
                {rt === 'gabled' ? 'Gabled' : 'Skillion / Lean-to'}
              </button>
            );
          })}
        </div>

        {/* Mode picker — pick which 2 inputs you have */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            I HAVE
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                    background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                    color: active ? 'var(--color-orange)' : 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    letterSpacing: '-0.2px',
                  }}
                >
                  {getModeLabel(m.id, roofType)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single inputs card — primary 2 + ridge/overhang + optional birdsmouth */}
        <div style={{
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {/* Active 2 inputs based on mode */}
          <div style={{ display: 'flex', gap: 12 }}>
            {activeFields.map(field => {
              const meta = FIELD_META[field];
              const label = field === 'span' && roofType === 'skillion' ? 'Run' : meta.label;
              const hint  = field === 'span' && roofType === 'skillion' ? 'horizontal run'
                : field === 'rafterLength' && hasRidge && meta.hintWithRidge ? meta.hintWithRidge
                : meta.hintNoRidge;
              return (
                <div key={field} style={{ flex: 1, minWidth: 0 }}>
                  {meta.units ? (
                    <NumberInput label={label} value={inputs[field]} onChange={set(field)} units={meta.units} placeholder="" hint={hint} />
                  ) : (
                    <NumberInput label={label} value={inputs[field]} onChange={set(field)} unit={meta.unit} placeholder="" hint={hint} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {roofType === 'gabled' && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput label="Ridge thickness" value={inputs.ridgeThickness} onChange={set('ridgeThickness')} units={['mm', 'm']} placeholder="" hint="for cut length" />
              </div>
            )}
            <div style={{ flex: roofType === 'skillion' ? undefined : 1, minWidth: 0 }}>
              <NumberInput label="Eaves overhang" value={inputs.overhang} onChange={set('overhang')} units={['m', 'mm']} placeholder="" hint="each side" />
            </div>
          </div>

          <div style={{ height: 0.5, background: 'var(--color-border)', margin: '4px -16px' }} />

          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            BIRDSMOUTH <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Rafter depth" value={inputs.rafterDepth} onChange={set('rafterDepth')} units={['mm', 'm']} placeholder="e.g. 190" hint="optional · timber size" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Plate width" value={inputs.plateWidth} onChange={set('plateWidth')} units={['mm', 'm']} placeholder="e.g. 90" hint="optional · birdsmouth seat" />
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

        {result && out && (
          <>
            <RoofDiagram
              buildingWidthMm={out.span * 1000}
              pitchDegrees={out.pitchDegrees}
              ridgeHeightMm={out.ridgeHeight * 1000}
              rafterLengthMm={Math.round(out.totalRafterLength * 1000)}
              overhangMm={parseOpt(inputs.overhang) ? parseOpt(inputs.overhang)! * 1000 : 0}
              seatWidthMm={out.birdsmouthPlumbDepth > 0 ? parseOpt(inputs.plateWidth) : undefined}
              plumbDepthMm={out.birdsmouthPlumbDepth > 0 ? out.birdsmouthPlumbDepth : undefined}
              cutRafterLengthMm={out.totalRafterLength > out.rafterLength ? Math.round(out.rafterLength * 1000) : undefined}
            />

            {/* Summary: all 4 derived values + cut angles */}
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
                <RafterDimChip label={roofType === 'skillion' ? 'Run' : 'Span'} value={String(out.span)} unit="m" />
                <RafterDimChip label="Rise"   value={String(out.rise)}         unit="m" />
                <RafterDimChip label={hasRidge ? 'Rafter (cut)' : 'Rafter'} value={String(out.totalRafterLength)} unit="m" />
                <RafterDimChip label="Pitch"  value={String(out.pitchDegrees)} unit="°" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <ResultCard label="Plumb cut" value={out.plumbCutAngle} unit="°" />
                <ResultCard label="Seat cut" value={out.seatCutAngle} unit="°" />
              </div>
            </div>

            {/* Rafter cut details — only when optional inputs were provided */}
            {(out.birdsmouthPlumbDepth > 0 || out.ridgeShortening > 0) && (
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>RAFTER CUT DETAILS</p>
                {out.birdsmouthPlumbDepth > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Birdsmouth</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Seat width" value={parseOpt(inputs.plateWidth) ?? 0} unit="mm" />
                      <ResultCard label="Plumb depth" value={out.birdsmouthPlumbDepth} unit="mm" />
                    </div>
                    {out.remainingDepth > 0 && (
                      <div style={{
                        background: out.remainingDepth < out.birdsmouthPlumbDepth * 0.5 ? '#fff7ed' : 'var(--color-bg)',
                        border: `0.5px solid ${out.remainingDepth < out.birdsmouthPlumbDepth * 0.5 ? '#fbbf24' : 'var(--color-border)'}`,
                        borderRadius: 8,
                        padding: '7px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
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
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500 }}>Ridge shortening</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <ResultCard label="Line length" value={Math.round(out.lineRafterLength * 1000)} unit="mm" />
                      <ResultCard label="Shorten by" value={out.ridgeShortening} unit="mm" />
                    </div>
                  </div>
                )}
              </div>
            )}

            <ApprenticeWorking
              steps={roofSteps}
              finalAnswer={`${roofRafterMm}mm`}
              finalLabel={hasRidge ? 'Cut rafter length' : 'Rafter length'}
              visible={settings.apprenticeMode}
              id="roof"
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.roof[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
