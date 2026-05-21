import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateFencing } from '../calculators/fencing';
import type { FenceType, PalingStyle, FencingResult } from '../calculators/fencing';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';

const HEIGHTS = [1.2, 1.5, 1.8] as const;
const SPACINGS_PALING = [1.8, 2.4] as const;
const SPACINGS_RAIL = [2.4, 3.0] as const;
const PALING_WIDTHS = [75, 100] as const;

export function FencingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [fenceType, setFenceType] = useState<FenceType>('paling');
  const [runLength, setRunLength] = useState('');
  const [height, setHeight] = useState<number | 'custom'>(1.8);
  const [customHeight, setCustomHeight] = useState('');
  const [postSpacing, setPostSpacing] = useState<number | 'custom'>(1.8);
  const [customSpacing, setCustomSpacing] = useState('');
  const [railCount, setRailCount] = useState<number | 'custom'>(3);
  const [customRailCount, setCustomRailCount] = useState('');
  const [palingWidth, setPalingWidth] = useState<number | 'custom'>(100);
  const [customPalingWidth, setCustomPalingWidth] = useState('');
  const [palingStyle, setPalingStyle] = useState<PalingStyle>('lapped');
  const [customGap, setCustomGap] = useState('10');

  const [wasteBuffer, setWasteBuffer] = useState(0);

  const [result, setResult] = useState<FencingResult | null>(null);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');

  const resolvedHeight = height === 'custom' ? parseFloat(customHeight) || 0 : height;
  const resolvedSpacing = postSpacing === 'custom' ? parseFloat(customSpacing) || 0 : postSpacing;
  const resolvedRailCount = railCount === 'custom' ? parseInt(customRailCount) || 0 : railCount;
  const resolvedPalingWidth = palingWidth === 'custom' ? parseFloat(customPalingWidth) || 0 : palingWidth;

  function handleFenceTypeChange(t: FenceType) {
    setFenceType(t);
    setPostSpacing(t === 'rail' ? 2.4 : 1.8);
    setCustomSpacing('');
    setResult(null);
    setError('');
  }

  function handleHeightToggle(h: number | 'custom') {
    setHeight(h);
    if (h !== 'custom') {
      setRailCount(h <= 1.5 ? 2 : 3);
      setCustomRailCount('');
    }
    setResult(null);
    setError('');
  }

  function handleCalculate() {
    const run = parseFloat(runLength);
    if (!run || run <= 0) { setError('Enter a fence run length.'); return; }
    if (!resolvedHeight || resolvedHeight <= 0) { setError('Enter a fence height.'); return; }
    if (!resolvedSpacing || resolvedSpacing <= 0) { setError('Enter a post spacing.'); return; }
    if (!resolvedRailCount || resolvedRailCount < 1) { setError('Enter a rail count.'); return; }
    if (fenceType === 'paling' && (!resolvedPalingWidth || resolvedPalingWidth <= 0)) {
      setError('Enter a paling width.'); return;
    }

    setError('');

    const calc = calculateFencing({
      runLength: run,
      height: resolvedHeight,
      postSpacing: resolvedSpacing,
      fenceType,
      railCount: resolvedRailCount,
      palingWidthMm: resolvedPalingWidth,
      palingStyle,
      palingOverlapMm: 15,
      palingGapMm: parseFloat(customGap) || 10,
    });

    setResult(calc);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'fencing',
      timestamp: Date.now(),
      inputs: { runLength: run, height: resolvedHeight, postSpacing: resolvedSpacing, fenceType, railCount },
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

  const btn = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: active ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
    background: active ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
    color: active ? 'var(--color-orange)' : 'var(--color-text)',
    fontWeight: active ? 500 : 400,
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  const o = result?.outputs;
  const spacings = fenceType === 'paling' ? SPACINGS_PALING : SPACINGS_RAIL;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Fencing" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={cardStyle}>
          {/* Fence type */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>FENCE TYPE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn(fenceType === 'paling')} onClick={() => handleFenceTypeChange('paling')}>Paling</button>
              <button style={btn(fenceType === 'rail')} onClick={() => handleFenceTypeChange('rail')}>Post & Rail</button>
            </div>
          </div>

          {/* Run length */}
          <NumberInput
            label="Fence run"
            value={runLength}
            onChange={v => { setRunLength(v); setResult(null); }}
            units={['m']}
            placeholder="e.g. 24"
            hint="total length of fence"
          />

          {/* Height */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>FENCE HEIGHT</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {HEIGHTS.map(h => (
                <button key={h} style={btn(height === h)} onClick={() => handleHeightToggle(h)}>
                  {h}m
                </button>
              ))}
              <button style={btn(height === 'custom')} onClick={() => handleHeightToggle('custom')}>Custom</button>
            </div>
            {height === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={customHeight}
                  onChange={v => { setCustomHeight(v); setResult(null); }}
                  units={['m', 'mm']}
                  placeholders={{ m: 'e.g. 2.1', mm: 'e.g. 2100' }}
                />
              </div>
            )}
          </div>

          {/* Post spacing */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>POST SPACING</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {spacings.map(s => (
                <button key={s} style={btn(postSpacing === s)} onClick={() => { setPostSpacing(s); setCustomSpacing(''); setResult(null); }}>
                  {s}m
                </button>
              ))}
              <button style={btn(postSpacing === 'custom')} onClick={() => { setPostSpacing('custom'); setResult(null); }}>Custom</button>
            </div>
            {postSpacing === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={customSpacing}
                  onChange={v => { setCustomSpacing(v); setResult(null); }}
                  units={['m', 'mm']}
                  placeholders={{ m: 'e.g. 2.0', mm: 'e.g. 2000' }}
                />
              </div>
            )}
          </div>

          {/* Rails */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>RAILS</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[2, 3].map(r => (
                <button key={r} style={btn(railCount === r)} onClick={() => { setRailCount(r); setCustomRailCount(''); setResult(null); }}>
                  {r} rails
                </button>
              ))}
              <button style={btn(railCount === 'custom')} onClick={() => { setRailCount('custom'); setResult(null); }}>Custom</button>
            </div>
            {railCount === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={customRailCount}
                  onChange={v => { setCustomRailCount(v); setResult(null); }}
                  units={[]}
                  placeholder="e.g. 4"
                />
              </div>
            )}
          </div>

          {/* Paling options */}
          {fenceType === 'paling' && (
            <>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>PALING WIDTH</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {PALING_WIDTHS.map(w => (
                    <button key={w} style={btn(palingWidth === w)} onClick={() => { setPalingWidth(w); setResult(null); }}>
                      {w}mm
                    </button>
                  ))}
                  <button style={btn(palingWidth === 'custom')} onClick={() => { setPalingWidth('custom'); setResult(null); }}>Custom</button>
                </div>
                {palingWidth === 'custom' && (
                  <div style={{ marginTop: 10 }}>
                    <NumberInput
                      label=""
                      value={customPalingWidth}
                      onChange={v => { setCustomPalingWidth(v); setResult(null); }}
                      unit="mm"
                      placeholder="e.g. 150"
                    />
                  </div>
                )}
              </div>

              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>PALING STYLE</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btn(palingStyle === 'lapped')} onClick={() => { setPalingStyle('lapped'); setResult(null); }}>
                    Lapped
                  </button>
                  <button style={btn(palingStyle === 'tight')} onClick={() => { setPalingStyle('tight'); setResult(null); }}>
                    Tight
                  </button>
                  <button style={btn(palingStyle === 'open')} onClick={() => { setPalingStyle('open'); setResult(null); }}>
                    Open
                  </button>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
                  {palingStyle === 'lapped' ? 'Palings overlap 15 mm — traditional paling fence'
                    : palingStyle === 'tight' ? 'Palings butted edge to edge — solid/close-board'
                    : `Palings with ${customGap || 10} mm gap — picket / open style`}
                </p>
                {palingStyle === 'open' && (
                  <div style={{ marginTop: 10 }}>
                    <NumberInput
                      label="Gap between palings"
                      value={customGap}
                      onChange={v => { setCustomGap(v); setResult(null); }}
                      unit="mm"
                      placeholder="e.g. 10"
                    />
                  </div>
                )}
              </div>
            </>
          )}
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

        {result && o && (
          <>
            {/* Waste buffer toggle */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 5, 10, 15].map(pct => (
                <button
                  key={pct}
                  onClick={() => setWasteBuffer(pct)}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 10,
                    border: wasteBuffer === pct ? '1.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                    background: wasteBuffer === pct ? 'rgba(255,90,31,0.06)' : 'var(--color-card)',
                    color: wasteBuffer === pct ? 'var(--color-orange)' : 'var(--color-muted)',
                    fontWeight: wasteBuffer === pct ? 500 : 400,
                    fontSize: 13,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  {pct === 0 ? 'No buffer' : `+${pct}%`}
                </button>
              ))}
            </div>

            {/* Materials list */}
            {(() => {
              const buf = wasteBuffer > 0 ? 1 + wasteBuffer / 100 : 1;
              const posts    = wasteBuffer > 0 ? Math.ceil(o.postCount * buf) : o.postCount;
              const rails    = wasteBuffer > 0 ? parseFloat((o.railLinealM * buf).toFixed(1)) : o.railLinealM;
              const palings  = wasteBuffer > 0 ? Math.ceil(o.palingCount * buf) : o.palingCount;
              const concrete = wasteBuffer > 0 ? Math.ceil(o.totalConcreteBags * buf) : o.totalConcreteBags;
              const row = (qty: number | string, unit: string, detail: string, showX = true) => (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 26, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {qty}
                  </span>
                  {showX && <span style={{ fontSize: 15, color: 'var(--color-muted)' }}>×</span>}
                  <span style={{ fontSize: 17, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
                    {unit}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', marginLeft: 'auto' }}>{detail}</span>
                </div>
              );
              return (
                <div style={{
                  background: 'var(--color-card)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                    ORDER{wasteBuffer > 0 ? ` · +${wasteBuffer}% buffer` : ''}
                  </p>
                  {row(posts, `${o.postTotalLengthMm} mm posts`, `${o.embedmentMm} mm in ground`)}
                  {row(rails, 'lm rails', `${resolvedRailCount} rails × ${parseFloat(runLength) || 0} m`, false)}
                  {fenceType === 'paling' && row(palings, `${resolvedHeight * 1000} mm palings`, `${resolvedPalingWidth} mm wide`)}
                  {row(concrete, '20 kg concrete bags', `${o.concretePerHoleBags} per hole`)}
                </div>
              );
            })()}

            {/* Post hole info */}
            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                Post holes — {o.postHoleDiameterMm} mm diameter × {o.postHoleDepthMm} mm deep.
                {fenceType === 'paling' && palingStyle !== 'tight'
                  ? ` Paling count based on ${palingStyle === 'lapped' ? '15 mm overlap' : `${customGap || 10} mm gap`}.`
                  : ''}
                {' '}Add 5–10% to all timber quantities for waste and end cuts.
              </p>
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${o.postCount} posts × ${o.postTotalLengthMm} mm, ${o.railLinealM} lm rails${fenceType === 'paling' ? `, ${o.palingCount} palings` : ''}`}
              finalLabel="Materials to order"
              visible={settings.apprenticeMode}
              id="fencing"
              glossary={[
                { term: 'Post spacing', definition: 'Centre-to-centre distance between fence posts. 1.8 m is standard for paling fences; 2.4–3.0 m for post and rail. Wider spacing means fewer posts but more stress on rails.' },
                { term: 'Embedment depth', definition: 'How far the post goes into the ground. Minimum 600 mm for fences up to 1.8 m. Deeper for taller fences or soft ground — roughly 1/3 of total post length.' },
                { term: 'Lapped paling', definition: 'Traditional paling fence where each paling slightly overlaps the next (typically 15 mm). Gives a solid look and allows for slight movement without gaps appearing.' },
                { term: 'Lineal metre (lm)', definition: 'A measurement of length regardless of cross-section. Rail timber is ordered in lineal metres — total length regardless of how many pieces.' },
                { term: 'Post hole concrete', definition: 'Premix concrete used to set fence posts. Pour around the post after setting to plumb, let cure 24–48 hours before attaching rails.' },
              ]}
            />

            <AddToJobPrompt calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.fencing[settings.region]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
