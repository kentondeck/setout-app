import { useState, useContext } from 'react';
import { hapticMedium } from '../lib/haptics';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero } from '../components/CalcResult';
import { calculateExcavation } from '../calculators/excavation';
import type { ExcavationResult } from '../calculators/excavation';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { JobNameInput } from '../components/JobNameInput';
import { uuid } from '../lib/uuid';

import { useScrollToResult } from '../lib/useScrollToResult';
const SWELL_PRESETS = [
  { label: 'None', sublabel: 'Rock / fill', value: 0 },
  { label: 'Sandy', sublabel: '~15% swell', value: 0.15 },
  { label: 'General', sublabel: '~25% swell', value: 0.25 },
  { label: 'Clay', sublabel: '~35% swell', value: 0.35 },
] as const;

const TRUCK_SIZES = [6, 8, 10] as const;

interface Inputs {
  length: string;
  width: string;
  depthNear: string;
  depthFar: string;
}

const DEFAULTS: Inputs = { length: '', width: '', depthNear: '', depthFar: '' };

function fmt(n: number): string {
  return Number.isFinite(n) ? String(n) : '—';
}

function ExcavationDiagram({ length, width, depthNear, depthFar, sloped, label }: {
  length: number; width: number; depthNear: number; depthFar: number; sloped: boolean; label?: string;
}) {
  const ORANGE = '#FF5A1F';
  const INK = '#0A0A0A';
  const FILL = '#ECECE8';
  const FONT = 'Inter, system-ui, sans-serif';

  // Axonometric projection coords
  const ox = 32, oy = 20;
  const groundY = 55;

  // Scale diagram so the far end (top at y=35) never overflows the 160px viewBox.
  // maxFarH=105 keeps the far bottom at y≤140, leaving headroom for labels.
  const farRatio = sloped && depthNear > 0 ? depthFar / depthNear : 1;
  const baseNearH = 75;
  const maxFarH = 105;
  const scale = Math.min(1, maxFarH / (baseNearH * Math.max(1, farRatio)));
  const nearH = baseNearH * scale;
  const farH = baseNearH * farRatio * scale;

  const ftl = { x: 40,  y: groundY };
  const ftr = { x: 200, y: groundY };
  const fbl = { x: 40,  y: groundY + nearH };
  const fbr = { x: 200, y: groundY + nearH };
  const bbl = { x: fbl.x + ox, y: fbl.y - oy };
  const bbr = { x: fbr.x + ox, y: fbr.y - oy };
  const btl = { x: ftl.x + ox, y: ftl.y - oy };
  const btr = { x: ftr.x + ox, y: ftr.y - oy };
  const bblSloped = { x: bbl.x, y: btl.y + farH };
  const bbrSloped = { x: bbr.x, y: btr.y + farH };
  const p = (pt: { x: number; y: number }) => `${pt.x},${pt.y}`;

  return (
    <svg
      viewBox="0 0 280 160"
      style={{ width: '100%', borderRadius: 10, background: FILL }}
    >
      {/* Ground surface — left and right of hole */}
      <line x1="0" y1={groundY} x2={ftl.x} y2={groundY} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <line x1={ftr.x} y1={groundY} x2={ftr.x + ox} y2={groundY - oy} stroke={INK} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
      <line x1={ftr.x + ox} y1={groundY - oy} x2={280} y2={groundY - oy} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

      {/* Hole fill */}
      <polygon
        points={`${p(ftl)} ${p(ftr)} ${p(fbr)} ${p(fbl)}`}
        fill="#D8D8D4"
      />
      <polygon
        points={`${p(ftr)} ${p(btr)} ${p(bbrSloped)} ${p(fbr)}`}
        fill="#C8C8C4"
      />
      <polygon
        points={`${p(fbl)} ${p(fbr)} ${p(bbrSloped)} ${p(bblSloped)}`}
        fill="#BCBCB8"
      />

      {/* Front face outline */}
      <polyline points={`${p(ftl)} ${p(ftr)} ${p(fbr)} ${p(fbl)} ${p(ftl)}`}
        fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Right face */}
      <polyline points={`${p(ftr)} ${p(btr)} ${p(bbrSloped)} ${p(fbr)}`}
        fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Back top edge */}
      <line x1={btl.x} y1={btl.y} x2={btr.x} y2={btr.y} stroke={INK} strokeWidth="1" strokeDasharray="4 3" />

      {/* Floor back edge */}
      <line x1={bblSloped.x} y1={bblSloped.y} x2={bbrSloped.x} y2={bbrSloped.y}
        stroke={INK} strokeWidth="1" strokeDasharray="4 3" />

      {/* Left back edge (dashed) */}
      <line x1={ftl.x} y1={ftl.y} x2={btl.x} y2={btl.y} stroke={INK} strokeWidth="1" strokeDasharray="4 3" />
      <line x1={fbl.x} y1={fbl.y} x2={bblSloped.x} y2={bblSloped.y} stroke={INK} strokeWidth="1" strokeDasharray="4 3" />

      {/* Width label */}
      <line x1={ftl.x} y1={groundY + 12} x2={ftr.x} y2={groundY + 12} stroke={ORANGE} strokeWidth="1" />
      <line x1={ftl.x} y1={groundY + 8} x2={ftl.x} y2={groundY + 16} stroke={ORANGE} strokeWidth="1" />
      <line x1={ftr.x} y1={groundY + 8} x2={ftr.x} y2={groundY + 16} stroke={ORANGE} strokeWidth="1" />
      <text x={(ftl.x + ftr.x) / 2} y={groundY + 24} textAnchor="middle" fontFamily={FONT} fontSize="9" fill={ORANGE}>W {width}m</text>

      {/* Depth label — front-left edge */}
      <line x1={ftl.x - 10} y1={ftl.y} x2={ftl.x - 10} y2={fbl.y} stroke={ORANGE} strokeWidth="1" />
      <line x1={ftl.x - 14} y1={ftl.y} x2={ftl.x - 6} y2={ftl.y} stroke={ORANGE} strokeWidth="1" />
      <line x1={ftl.x - 14} y1={fbl.y} x2={ftl.x - 6} y2={fbl.y} stroke={ORANGE} strokeWidth="1" />
      <text x={ftl.x - 22} y={(ftl.y + fbl.y) / 2 + 4} textAnchor="middle" fontFamily={FONT} fontSize="9" fill={ORANGE}
        transform={`rotate(-90, ${ftl.x - 22}, ${(ftl.y + fbl.y) / 2 + 4})`}>
        D {depthNear}m{sloped ? `→${depthFar}m` : ''}
      </text>

      {/* Length label — perspective top edge */}
      <line x1={btr.x + 8} y1={btr.y} x2={ftr.x + 8} y2={ftr.y} stroke={ORANGE} strokeWidth="1" />
      <text x={btr.x + 14} y={(btr.y + ftr.y) / 2 + 3} fontFamily={FONT} fontSize="9" fill={ORANGE}>L {length}m</text>

      {label && <text x={274} y={13} textAnchor="end" fontFamily={FONT} fontSize="11" fontWeight="600" fill={ORANGE} opacity={0.7}>{label}</text>}
    </svg>
  );
}

export function ExcavationCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [sloped, setSloped] = useState(false);
  const [swellFactor, setSwellFactor] = useState(0.25);
  const [truckSize, setTruckSize] = useState(8);
  const [customTruck, setCustomTruck] = useState('');
  const [result, setResult] = useState<ExcavationResult | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  function set(field: keyof Inputs) {
    return (value: string) => {
      setInputs(prev => ({ ...prev, [field]: value }));
      setError('');
    };
  }

  function handleCalculate() {
    const length   = parseFloat(inputs.length);
    const width    = parseFloat(inputs.width);
    const depthNear = parseFloat(inputs.depthNear);
    const depthFar  = sloped ? parseFloat(inputs.depthFar) : undefined;

    if (!length || length <= 0)    { setError('Enter a length.'); return; }
    if (!width  || width  <= 0)    { setError('Enter a width.'); return; }
    if (!depthNear || depthNear <= 0) { setError('Enter a depth.'); return; }
    if (sloped && (!depthFar || depthFar <= 0)) { setError('Enter the far-end depth for a sloped site.'); return; }

    const effectiveTruckSize = customTruck && parseFloat(customTruck) > 0 ? parseFloat(customTruck) : truckSize;
    if (effectiveTruckSize <= 0) { setError('Enter a truck capacity.'); return; }

    setError('');
    const calc = calculateExcavation({
      length, width, depthNear,
      ...(sloped && depthFar ? { depthFar } : {}),
      swellFactor,
      truckCapacity: effectiveTruckSize,
    });
    setResult(calc);

    const id = uuid();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'excavation',
      timestamp: Date.now(),
      inputs: { length, width, depthNear, ...(sloped && depthFar ? { depthFar } : {}), swellFactor, truckSize: effectiveTruckSize },
      outputs: calc.outputs,
    });

    hapticMedium();
  }

  const cardStyle = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
  };

  const displayTruckSize = customTruck && parseFloat(customTruck) > 0 ? parseFloat(customTruck) : truckSize;
  const swellLabel = SWELL_PRESETS.find(p => p.value === swellFactor)?.label ?? 'Custom';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Excavation" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Dimensions */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Length" value={inputs.length} onChange={set('length')} units={['m', 'mm']} placeholder="e.g. 8" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Width" value={inputs.width} onChange={set('width')} units={['m', 'mm']} placeholder="e.g. 5" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput
                label={sloped ? 'Near depth' : 'Depth'}
                value={inputs.depthNear}
                onChange={set('depthNear')}
                units={['m', 'mm']}
                placeholder="e.g. 1.5"
                hint={sloped ? 'shallow end' : undefined}
              />
            </div>
            {sloped ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <NumberInput label="Far depth" value={inputs.depthFar} onChange={set('depthFar')} units={['m', 'mm']} placeholder="e.g. 2.5" hint="deep end" />
              </div>
            ) : (
              <div style={{ flex: 1 }} />
            )}
          </div>

          {/* Sloped toggle */}
          <button
            onClick={() => { setSloped(s => !s); setInputs(prev => ({ ...prev, depthFar: '' })); setResult(null); }}
            style={{
              alignSelf: 'flex-start',
              padding: '8px 14px',
              borderRadius: 10,
              border: '0.5px solid var(--color-border)',
              background: sloped ? 'var(--color-orange)' : 'var(--color-card)',
              color: sloped ? '#fff' : 'var(--color-muted)',
              fontSize: 13,
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {sloped ? 'Sloped site' : 'Flat site'} — tap to toggle
          </button>
        </div>

        {/* Soil type */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Soil type
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SWELL_PRESETS.map(preset => {
              const active = swellFactor === preset.value;
              return (
                <button
                  key={preset.label}
                  onClick={() => setSwellFactor(preset.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-card)',
                    border: '0.5px solid var(--color-border)',
                    background: active ? 'var(--color-orange)' : 'var(--color-card)',
                    color: active ? '#fff' : 'var(--color-text)',
                    fontWeight: 500,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <span>{preset.label}</span>
                  <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 400 }}>{preset.sublabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Truck size */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Truck capacity
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            {TRUCK_SIZES.map(size => {
              const active = !customTruck && truckSize === size;
              return (
                <button
                  key={size}
                  onClick={() => { setTruckSize(size); setCustomTruck(''); setResult(null); }}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 'var(--radius-card)',
                    border: '0.5px solid var(--color-border)',
                    background: active ? 'var(--color-orange)' : 'var(--color-card)',
                    color: active ? '#fff' : 'var(--color-text)',
                    fontWeight: 500,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    textAlign: 'center' as const,
                  }}
                >
                  {size} m³
                </button>
              );
            })}
            {/* Custom capacity inline */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '0 10px',
              borderRadius: 'var(--radius-card)',
              border: customTruck ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
              background: customTruck ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
            }}>
              <input
                type="number"
                inputMode="decimal"
                value={customTruck}
                onChange={e => { setCustomTruck(e.target.value); setResult(null); }}
                placeholder="—"
                style={{
                  width: 0,
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  color: customTruck ? 'var(--color-orange)' : 'var(--color-text)',
                  fontWeight: customTruck ? 500 : 400,
                  outline: 'none',
                  textAlign: 'center',
                  minWidth: 0,
                }}
              />
              <span style={{ fontSize: 12, color: customTruck ? 'var(--color-orange)' : 'var(--color-muted)', flexShrink: 0 }}>m³</span>
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
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ResultHero
              label="Cart off"
              value={fmt(result.outputs.truckLoads)}
              unit={`× ${displayTruckSize} m³ loads`}
              spec={`${inputs.length}m × ${inputs.width}m${sloped ? ` · ${inputs.depthNear}–${inputs.depthFar}m deep` : ` × ${inputs.depthNear}m deep`}`}
              stats={[
                { label: `${fmt(result.outputs.bankVolume)} m³ bank` },
                ...(swellFactor > 0 ? [{ label: `${fmt(result.outputs.looseVolume)} m³ loose (${swellLabel})` }] : []),
                ...(sloped ? [{ label: `${fmt(result.outputs.avgDepth)} m avg` }] : []),
              ]}
            />

            <ExcavationDiagram
              length={result.outputs.length}
              width={result.outputs.width}
              depthNear={result.outputs.depthNear}
              depthFar={result.outputs.depthFar}
              sloped={sloped}
              label={jobName}
            />

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${result.outputs.truckLoads} truck loads`}
              finalLabel={`${result.outputs.looseVolume} m³ loose (${swellLabel} swell)`}
              visible={settings.apprenticeMode}
              id="excavation"
            />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.excavation[settings.region]}
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
