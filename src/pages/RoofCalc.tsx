import { useState, useContext } from 'react';
import { hapticMedium } from '../lib/haptics';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero } from '../components/CalcResult';
import { calculateRoof, RoofInputError } from '../calculators/roof';
import type { RoofOutputs } from '../calculators/roof';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { useCalcGate } from '../lib/useCalcGate';
import { useCalcPrefill } from '../lib/useCalcPrefill';
import { RoofDiagram } from '../components/RoofDiagram';
import { useScrollToResult } from '../lib/useScrollToResult';
import { JobNameInput } from '../components/JobNameInput';
import { uuid } from '../lib/uuid';

type PairKey = 'span' | 'rise' | 'rafterLength' | 'pitchDegrees';
type Mode = 'span-pitch' | 'span-rise' | 'rise-pitch';
type RoofType = 'gabled' | 'skillion';

// Rafter length is only ever an OUTPUT — you enter the building geometry and the
// calc hands back the rafter. There's no "rafter length" input mode on purpose:
// a typed rafter length is ambiguous (to ridge? incl. overhang?) and confused
// users. Every mode below is unambiguous building geometry.
const MODES: { id: Mode; fields: [PairKey, PairKey] }[] = [
  { id: 'span-pitch',   fields: ['span', 'pitchDegrees'] },
  { id: 'span-rise',    fields: ['span', 'rise'] },
  { id: 'rise-pitch',   fields: ['rise', 'pitchDegrees'] },
];

function getModeLabel(id: Mode, roofType: RoofType): string {
  if (id === 'span-pitch')   return roofType === 'skillion' ? 'Run + Pitch'   : 'Span + Pitch';
  if (id === 'span-rise')    return roofType === 'skillion' ? 'Run + Rise'    : 'Span + Rise';
  return 'Rise + Pitch';
}

const FIELD_META: Record<PairKey, { label: string; units: ['m', 'mm'] | ['mm', 'm'] | null; unit?: string; placeholder?: string; placeholders?: Record<string, string>; hintNoRidge: string; hintWithRidge?: string }> = {
  span:         { label: 'Span',          units: ['m', 'mm'], placeholders: { m: 'e.g. 7', mm: 'e.g. 7000' },      hintNoRidge: 'full width' },
  rise:         { label: 'Rise',          units: ['m', 'mm'], placeholders: { m: 'e.g. 1.5', mm: 'e.g. 1500' },    hintNoRidge: 'ridge height' },
  rafterLength: { label: 'Rafter length', units: ['m', 'mm'], placeholders: { m: 'e.g. 4.2', mm: 'e.g. 4200' },    hintNoRidge: 'total on the rake (incl. overhang)', hintWithRidge: 'total on the rake, to ridge face' },
  pitchDegrees: { label: 'Pitch',         units: null, unit: '°', placeholder: 'e.g. 22.5',                         hintNoRidge: 'degrees' },
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
  const { addEntry, updateEntry } = useContext(HistoryContext);
  const gate = useCalcGate();

  const [roofType, setRoofType] = useState<RoofType>('gabled');
  const [mode, setMode] = useState<Mode>('span-pitch');
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  useCalcPrefill(setInputs);
  const [result, setResult] = useState<{ outputs: RoofOutputs; steps: WorkingStep[] } | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

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
    // Subscription gate — one free run per calculator, then flash-and-paywall.
    gate.gateCalc('roof', () => setResult(null));
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

      const id = uuid();
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

      hapticMedium();
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
                  border: '0.5px solid var(--color-border)',
                  background: active ? 'var(--color-orange)' : 'var(--color-card)',
                  color: active ? '#fff' : 'var(--color-text)',
                  fontSize: 13,
                  fontWeight: 600,
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
                    border: '0.5px solid var(--color-border)',
                    background: active ? 'var(--color-orange)' : 'var(--color-card)',
                    color: active ? '#fff' : 'var(--color-text)',
                    fontSize: 13,
                    fontWeight: 600,
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
                    <NumberInput label={label} value={inputs[field]} onChange={set(field)} units={meta.units} placeholders={meta.placeholders} hint={hint} />
                  ) : (
                    <NumberInput label={label} value={inputs[field]} onChange={set(field)} unit={meta.unit} placeholder={meta.placeholder} hint={hint} />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {roofType === 'gabled' && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput label="Ridge thickness" value={inputs.ridgeThickness} onChange={set('ridgeThickness')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 35', m: 'e.g. 0.035' }} hint="for cut length" />
              </div>
            )}
            <div style={{ flex: roofType === 'skillion' ? undefined : 1, minWidth: 0 }}>
              <NumberInput label="Eaves overhang" value={inputs.overhang} onChange={set('overhang')} units={['m', 'mm']} placeholders={{ m: 'e.g. 0.6', mm: 'e.g. 600' }} hint="each side" />
            </div>
          </div>

          <p style={{ margin: '-4px 0 0', fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>
            Overhang is measured <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>on the flat</span> (horizontal), not along the rake — the calc adds the slope length for you.
          </p>

          <div style={{ height: 0.5, background: 'var(--color-border)', margin: '4px -16px' }} />

          <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
            BIRDSMOUTH <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional</span>
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Rafter depth" value={inputs.rafterDepth} onChange={set('rafterDepth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 190', m: 'e.g. 0.19' }} hint="optional · timber size" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Plate width" value={inputs.plateWidth} onChange={set('plateWidth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 90', m: 'e.g. 0.09' }} hint="optional · birdsmouth seat" />
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
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label={hasRidge ? 'Cut rafter length' : 'Rafter length'}
              value={out.totalRafterLength}
              unit="m"
              spec={`${roofType === 'skillion' ? 'Skillion' : 'Gabled'} · ${out.span}m ${roofType === 'skillion' ? 'run' : 'span'} · ${out.pitchDegrees}° pitch · ${out.rise}m rise`}
              stats={[
                { label: `Plumb ${out.plumbCutAngle}°` },
                { label: `Seat ${out.seatCutAngle}°` },
                ...(out.birdsmouthPlumbDepth > 0 ? [{ label: `Birdsmouth ${out.birdsmouthPlumbDepth}mm` }] : []),
                ...(out.ridgeShortening > 0 ? [{ label: `Shorten ${out.ridgeShortening}mm` }] : []),
              ]}
            />

            <RoofDiagram
              buildingWidthMm={out.span * 1000}
              pitchDegrees={out.pitchDegrees}
              ridgeHeightMm={out.ridgeHeight * 1000}
              rafterLengthMm={Math.round(out.totalRafterLength * 1000)}
              overhangMm={parseOpt(inputs.overhang) ? parseOpt(inputs.overhang)! * 1000 : 0}
              seatWidthMm={out.birdsmouthPlumbDepth > 0 ? parseOpt(inputs.plateWidth) : undefined}
              plumbDepthMm={out.birdsmouthPlumbDepth > 0 ? out.birdsmouthPlumbDepth : undefined}
              cutRafterLengthMm={out.totalRafterLength > out.rafterLength ? Math.round(out.rafterLength * 1000) : undefined}
              label={jobName}
            />

            {/* Summary: all 6 derived values */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <ResultCard label={roofType === 'skillion' ? 'Run' : 'Span'} value={String(out.span)} unit="m" accent />
              <ResultCard label={hasRidge ? 'Rafter (cut)' : 'Rafter'} value={String(out.totalRafterLength)} unit="m" accent />
              <ResultCard label="Rise"       value={String(out.rise)}         unit="m" />
              <ResultCard label="Pitch"      value={String(out.pitchDegrees)} unit="°" />
              <ResultCard label="Plumb cut"  value={out.plumbCutAngle}        unit="°" />
              <ResultCard label="Seat cut"   value={out.seatCutAngle}         unit="°" />
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
                        background: out.remainingDepth < (parseOpt(inputs.rafterDepth) ?? 0) * (2 / 3) ? '#fff7ed' : 'var(--color-bg)',
                        border: `0.5px solid ${out.remainingDepth < (parseOpt(inputs.rafterDepth) ?? 0) * (2 / 3) ? '#fbbf24' : 'var(--color-border)'}`,
                        borderRadius: 8,
                        padding: '7px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Remaining depth</span>
                        <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: 'tabular-nums', color: out.remainingDepth < (parseOpt(inputs.rafterDepth) ?? 0) * (2 / 3) ? '#92400e' : 'var(--color-text)' }}>
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
              glossary={[
                { term: 'Pitch', definition: 'The steepness of the roof expressed as degrees (or rise over run). A 22.5° pitch is common for metal roofing in Australia.' },
                { term: 'Span', definition: 'The full width of the building from outside wall to outside wall, measured at the eaves.' },
                { term: 'Rise', definition: 'The vertical height from the top of the ceiling joist (or top plate) up to the ridge.' },
                { term: 'Common rafter', definition: 'The main sloping timber running from the ridge down to the top plate. Its length drives material orders.' },
                { term: 'Ridge', definition: 'The horizontal beam at the very peak of the roof where opposing rafters meet.' },
                { term: 'Fascia', definition: 'The vertical board fixed to the rafter tails at the eave. The gutter attaches to it.' },
                { term: 'Eave', definition: 'The part of the roof that overhangs the wall. Provides weather protection and controls sun.' },
              ]}
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {roofType === 'skillion'
                ? 'Figures are for a single-slope skillion / lean-to roof. '
                : 'Figures are for a symmetrical gable roof (common rafters both sides). '}
              {COMPLIANCE_NOTES.roof[settings.region]}
            </p>

            <div style={{
              background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>Save</p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastEntryId} />
              <ShareCalcButton calculationId={lastEntryId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
