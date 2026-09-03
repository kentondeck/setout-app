import { useState, useContext } from 'react';
import { hapticMedium } from '../lib/haptics';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { AddToQuoteButton } from '../components/AddToQuoteButton';
import { calculateFencing } from '../calculators/fencing';
import { JobNameInput } from '../components/JobNameInput';
import type { FenceType, PalingStyle, FencingResult } from '../calculators/fencing';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { useScrollToResult } from '../lib/useScrollToResult';

const HEIGHTS = [1.2, 1.5, 1.8] as const;
const SPACINGS_PALING = [1.8, 2.4] as const;
const SPACINGS_RAIL = [2.4, 3.0] as const;
const PALING_WIDTHS = [75, 100] as const;
const HOLE_DIAMETERS = [250, 300, 450] as const;
const POST_WIDTHS = [90, 100, 125] as const;
// Rough small-load truck rate for topping up post holes — distinct from a full slab pour's per-m³
// price, since a small delivery usually carries a minimum-load fee. Confirm with your supplier.
const TRUCK_RATE_PER_M3 = 300;

export function FencingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry, updateEntry } = useContext(HistoryContext);

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
  const [palingStyle, setPalingStyle] = useState<PalingStyle>('tight');
  const [customGap, setCustomGap] = useState('10');
  const [customOverlap, setCustomOverlap] = useState('15');
  const [holeDiameter, setHoleDiameter] = useState<number | 'custom'>(250);
  const [customHoleDiameter, setCustomHoleDiameter] = useState('');
  const [postWidth, setPostWidth] = useState<number | 'custom'>(90);
  const [customPostWidth, setCustomPostWidth] = useState('');

  const [wasteBuffer, setWasteBuffer] = useState(0);

  const [result, setResult] = useState<FencingResult | null>(null);
  const resultRef = useScrollToResult(result);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');

  const resolvedHeight = height === 'custom' ? parseFloat(customHeight) || 0 : height;
  const resolvedSpacing = postSpacing === 'custom' ? parseFloat(customSpacing) || 0 : postSpacing;
  const resolvedRailCount = railCount === 'custom' ? parseInt(customRailCount) || 0 : railCount;
  const resolvedPalingWidth = palingWidth === 'custom' ? parseFloat(customPalingWidth) || 0 : palingWidth;
  const resolvedHoleDiameter = holeDiameter === 'custom' ? parseFloat(customHoleDiameter) || 0 : holeDiameter;
  const resolvedPostWidth = postWidth === 'custom' ? parseFloat(customPostWidth) || 0 : postWidth;

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
    if (!resolvedHoleDiameter || resolvedHoleDiameter <= 0) { setError('Enter a post hole diameter.'); return; }
    if (!resolvedPostWidth || resolvedPostWidth <= 0) { setError('Enter a post size.'); return; }

    setError('');

    const calc = calculateFencing({
      runLength: run,
      height: resolvedHeight,
      postSpacing: resolvedSpacing,
      fenceType,
      railCount: resolvedRailCount,
      palingWidthMm: resolvedPalingWidth,
      palingStyle,
      palingOverlapMm: parseFloat(customOverlap) || 15,
      palingGapMm: parseFloat(customGap) || 10,
      postHoleDiameterMm: resolvedHoleDiameter,
      postWidthMm: resolvedPostWidth,
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

    hapticMedium();
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
    border: '0.5px solid var(--color-border)',
    background: active ? 'var(--color-orange)' : 'var(--color-bg)',
    color: active ? '#fff' : 'var(--color-text)',
    fontWeight: 500,
    fontSize: 14,
    fontFamily: 'inherit',
    cursor: 'pointer',
  });

  const o = result?.outputs;
  const spacings = fenceType === 'paling' ? SPACINGS_PALING : SPACINGS_RAIL;

  // Buffered order quantities — shared between the ORDER display and the "Add to Quote" handoff.
  const buf = wasteBuffer > 0 ? 1 + wasteBuffer / 100 : 1;
  const bufferedPosts = o ? (wasteBuffer > 0 ? Math.ceil(o.postCount * buf) : o.postCount) : 0;
  const bufferedRails = o ? (wasteBuffer > 0 ? parseFloat((o.railLinealM * buf).toFixed(1)) : o.railLinealM) : 0;
  const bufferedPalings = o ? (wasteBuffer > 0 ? Math.ceil(o.palingCount * buf) : o.palingCount) : 0;
  const bufferedConcrete = o ? (wasteBuffer > 0 ? Math.ceil(o.totalConcreteBags * buf) : o.totalConcreteBags) : 0;
  const bufferedConcreteVolM3 = o ? (wasteBuffer > 0 ? parseFloat((o.totalConcreteVolM3 * buf).toFixed(2)) : o.totalConcreteVolM3) : 0;
  const truckCost = Math.round(bufferedConcreteVolM3 * TRUCK_RATE_PER_M3);

  const quoteMaterials = o ? [
    { item: `${o.postWidthMm}x${o.postWidthMm} treated pine post`, quantity: bufferedPosts, unit: 'each', note: `${o.postTotalLengthMm}mm long, ${o.embedmentMm}mm embedment` },
    { item: 'Fence rail (treated pine)', quantity: bufferedRails, unit: 'lineal metre', note: `${resolvedRailCount} rails × ${parseFloat(runLength) || 0}m run` },
    ...(fenceType === 'paling' ? [{ item: `${resolvedPalingWidth}mm treated pine fence paling`, quantity: bufferedPalings, unit: 'each', note: `${resolvedHeight * 1000}mm height, ${palingStyle}` }] : []),
    ...(o.recommendTruck
      ? [{ item: 'Ready-mix concrete', quantity: bufferedConcreteVolM3, unit: 'm3', note: 'truck delivery — post holes' }]
      : [{ item: '20kg concrete premix bag', quantity: bufferedConcrete, unit: 'bag', note: `${o.concretePerHoleBags} per hole` }]),
    { item: 'Framing nails (75-90mm)', quantity: o.framingNailBoxes, unit: 'box', note: 'skew-nail rails to posts' },
    ...(fenceType === 'paling' ? [{ item: 'Paling nails (30-40mm flat-head)', quantity: o.palingNailBoxes, unit: 'box', note: '2 per paling per rail' }] : []),
  ] : [];

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

          {/* Post size */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>POST SIZE</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {POST_WIDTHS.map(w => (
                <button key={w} style={btn(postWidth === w)} onClick={() => { setPostWidth(w); setCustomPostWidth(''); setResult(null); }}>
                  {w}×{w}mm
                </button>
              ))}
              <button style={btn(postWidth === 'custom')} onClick={() => { setPostWidth('custom'); setResult(null); }}>Custom</button>
            </div>
            {postWidth === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={customPostWidth}
                  onChange={v => { setCustomPostWidth(v); setResult(null); }}
                  unit="mm"
                  placeholder="e.g. 150"
                />
              </div>
            )}
          </div>

          {/* Post hole diameter */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>POST HOLE DIAMETER</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {HOLE_DIAMETERS.map(d => (
                <button key={d} style={btn(holeDiameter === d)} onClick={() => { setHoleDiameter(d); setCustomHoleDiameter(''); setResult(null); }}>
                  {d}mm
                </button>
              ))}
              <button style={btn(holeDiameter === 'custom')} onClick={() => { setHoleDiameter('custom'); setResult(null); }}>Custom</button>
            </div>
            {holeDiameter === 'custom' && (
              <div style={{ marginTop: 10 }}>
                <NumberInput
                  label=""
                  value={customHoleDiameter}
                  onChange={v => { setCustomHoleDiameter(v); setResult(null); }}
                  unit="mm"
                  placeholder="e.g. 375"
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
                  {palingStyle === 'lapped' ? `Palings overlap ${customOverlap || 15} mm — traditional paling fence`
                    : palingStyle === 'tight' ? 'Palings butted edge to edge — solid/close-board'
                    : `Palings with ${customGap || 10} mm gap — picket / open style`}
                </p>
                {palingStyle === 'lapped' && (
                  <div style={{ marginTop: 10 }}>
                    <NumberInput
                      label="Overlap between palings"
                      value={customOverlap}
                      onChange={v => { setCustomOverlap(v); setResult(null); }}
                      unit="mm"
                      placeholder="e.g. 15"
                    />
                  </div>
                )}
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
          <div ref={resultRef}>
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
                    border: '0.5px solid var(--color-border)',
                    background: wasteBuffer === pct ? 'var(--color-orange)' : 'var(--color-card)',
                    color: wasteBuffer === pct ? '#fff' : 'var(--color-muted)',
                    fontWeight: 500,
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
              const posts = bufferedPosts;
              const rails = bufferedRails;
              const palings = bufferedPalings;
              const concrete = bufferedConcrete;
              const row = (qty: number | string, unit: string, detail: string, showX = true) => (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    {qty}
                  </span>
                  {showX && <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>×</span>}
                  <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
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
                  {row(posts, `${o.postWidthMm}×${o.postWidthMm} × ${o.postTotalLengthMm} mm posts`, `${o.embedmentMm} mm in ground`)}
                  {row(rails, 'lm rails', `${resolvedRailCount} rails × ${parseFloat(runLength) || 0} m`, false)}
                  {fenceType === 'paling' && row(palings, `${resolvedHeight * 1000} mm palings`, `${resolvedPalingWidth} mm wide`)}
                  {o.recommendTruck
                    ? row(bufferedConcreteVolM3, 'm³ ready-mix', `~$${truckCost} @ $${TRUCK_RATE_PER_M3}/m³`, false)
                    : row(concrete, '20 kg concrete bags', `${o.concretePerHoleBags} per hole`)}
                  {row(o.framingNailBoxes, `box${o.framingNailBoxes !== 1 ? 'es' : ''} framing nails`, `${o.framingNailCount} nails`, false)}
                  {fenceType === 'paling' && row(o.palingNailBoxes, `box${o.palingNailBoxes !== 1 ? 'es' : ''} paling nails`, `${o.palingNailCount} nails`, false)}
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
                Post holes — {o.postHoleDiameterMm} mm diameter × {o.postHoleDepthMm} mm deep. Post stands 50 mm proud of the bottom (poured solid, no rubble) and its {o.postWidthMm}×{o.postWidthMm} mm cross-section is deducted from the concrete.
                {fenceType === 'paling' && palingStyle !== 'tight'
                  ? ` Paling count based on ${palingStyle === 'lapped' ? `${customOverlap || 15} mm overlap` : `${customGap || 10} mm gap`}.`
                  : ''}
                {' '}Add 5–10% to all timber quantities for waste and end cuts.
              </p>
            </div>

            <ApprenticeWorking
              steps={result.steps}
              finalAnswer={`${o.postCount} posts × ${o.postTotalLengthMm} mm, ${o.railLinealM} lm rails${fenceType === 'paling' ? `, ${o.palingCount} palings` : ''}, ${o.recommendTruck ? `${o.totalConcreteVolM3} m³ ready-mix` : `${o.totalConcreteBags} concrete bags`}`}
              finalLabel="Materials to order"
              visible={settings.apprenticeMode}
              id="fencing"
              glossary={[
                { term: 'Post spacing', definition: 'Centre-to-centre distance between fence posts. 1.8 m is standard for paling fences; 2.4–3.0 m for post and rail. Wider spacing means fewer posts but more stress on rails.' },
                { term: 'Embedment depth', definition: 'How far the post goes into the ground. Minimum 600 mm for fences up to 1.8 m. Deeper for taller fences or soft ground — roughly 1/3 of total post length.' },
                { term: 'Lapped paling', definition: 'Traditional paling fence where each paling slightly overlaps the next (typically 15 mm). Gives a solid look and allows for slight movement without gaps appearing.' },
                { term: 'Lineal metre (lm)', definition: 'A measurement of length regardless of cross-section. Rail timber is ordered in lineal metres — total length regardless of how many pieces.' },
                { term: 'Post hole concrete', definition: 'Premix concrete used to set fence posts. Pour around the post after setting to plumb, let cure 24–48 hours before attaching rails.' },
                { term: 'Post standoff', definition: 'The post is set 50 mm up off the very bottom of the hole rather than resting on bare soil, so it doesn’t sit in trapped moisture. That gap is poured solid with concrete along with the rest of the hole — not left open or packed with rubble.' },
                { term: 'Ready-mix vs bags', definition: 'Below roughly 30 bags, hand-mixing 20 kg premix on site is usually quicker and cheaper. Past that, a small truck load of ready-mix concrete works out faster overall despite the delivery cost.' },
              ]}
            />

            <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
            <AddToJobPrompt calculationId={lastEntryId} />
            <AddToQuoteButton
              scopeSummary={`${fenceType === 'paling' ? 'Paling' : 'Post & rail'} fence, ${parseFloat(runLength) || 0}m run, ${resolvedHeight}m high`}
              materials={quoteMaterials}
              jobName={jobName}
            />
            <ShareCalcButton calculationId={lastEntryId} />

            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              {COMPLIANCE_NOTES.fencing[settings.region]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
