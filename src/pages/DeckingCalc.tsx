import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ResultCard } from '../components/ResultCard';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { calculateDecking } from '../calculators/decking';
import type { DeckingResult, GapSuggestion } from '../calculators/decking';
import { calculateCutlist } from '../calculators/cutlist';
import type { CutlistResult } from '../calculators/cutlist';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { DeckingDiagram } from '../components/DeckingDiagram';

interface Inputs {
  deckLength: string;
  deckWidth: string;
  boardWidth: string;
  boardGap: string;
  joistSpacing: string;
  bearerSpacing: string;
}

const MILL_ALLOWANCE = 10;

const DEFAULTS: Inputs = {
  deckLength: '',
  deckWidth: '',
  boardWidth: '',
  boardGap: '',
  joistSpacing: '',
  bearerSpacing: '',
};

const fmt = (n: number): string => (Number.isFinite(n) ? String(n) : '—');

export function DeckingCalc() {
  const { settings } = useContext(SettingsContext);
  const { addEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<DeckingResult | null>(null);
  const [joistStock, setJoistStock] = useState(4800);
  const [bearerStock, setBearerStock] = useState(4800);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [persistedSuggestions, setPersistedSuggestions] = useState<{ items: GapSuggestion[]; lastBoardWidth: number } | null>(null);
  const [originalGap, setOriginalGap] = useState<number | null>(null);
  const [selectedJoinIdx, setSelectedJoinIdx] = useState(0);

  function set(field: keyof Inputs) {
    return (value: string) => setInputs(prev => ({ ...prev, [field]: value }));
  }

  function handleCalculate() {
    const length = parseFloat(inputs.deckLength);
    const width = parseFloat(inputs.deckWidth);
    const boardWidth = parseFloat(inputs.boardWidth);
    const boardGapRaw = parseFloat(inputs.boardGap);
    const boardGap = isFinite(boardGapRaw) && boardGapRaw >= 0 ? boardGapRaw : 5;
    const joistSpacing = parseFloat(inputs.joistSpacing);
    const bearerSpacing = parseFloat(inputs.bearerSpacing);

    if (!length || !width || length <= 0 || width <= 0) {
      setError('Enter a deck length and width to calculate.');
      return;
    }
    if (!boardWidth || boardWidth <= 0) {
      setError('Enter a valid board width.');
      return;
    }

    setError('');

    const calc = calculateDecking({ deckLength: length, deckWidth: width, boardWidth, boardGap, joistSpacing, bearerSpacing });
    setResult(calc);

    // Joists span deckLength, bearers span deckWidth — pick smallest fitting stock for each
    setJoistStock([3000, 4800, 5400, 6000].find(s => s + MILL_ALLOWANCE >= length * 1000) ?? 6000);
    setBearerStock([3600, 4800, 5400, 6000].find(s => s + MILL_ALLOWANCE >= width * 1000) ?? 6000);
    setPersistedSuggestions(
      calc.gapSuggestions.length > 0
        ? { items: calc.gapSuggestions, lastBoardWidth: calc.lastBoardWidth }
        : null
    );
    setOriginalGap(boardGap);

    const id = crypto.randomUUID();
    setLastEntryId(id);
    addEntry({
      id,
      calculatorId: 'decking',
      timestamp: Date.now(),
      inputs: { deckLength: length, deckWidth: width, boardWidth, boardGap, joistSpacing, bearerSpacing },
      outputs: calc.outputs,
    });

    if (navigator.vibrate) navigator.vibrate(30);
  }

  function applyGapSuggestion(gap: number) {
    const length = parseFloat(inputs.deckLength);
    const width = parseFloat(inputs.deckWidth);
    const boardWidth = parseFloat(inputs.boardWidth);
    const joistSpacing = parseFloat(inputs.joistSpacing);
    const bearerSpacing = parseFloat(inputs.bearerSpacing);
    setInputs(prev => ({ ...prev, boardGap: String(gap) }));
    const calc = calculateDecking({ deckLength: length, deckWidth: width, boardWidth, boardGap: gap, joistSpacing, bearerSpacing });
    setResult(calc);
  }

  const deckLengthMm = result ? Math.round(parseFloat(inputs.deckLength) * 1000) : 0;
  const deckWidthMm = result ? Math.round(parseFloat(inputs.deckWidth) * 1000) : 0;
  const bw = result ? parseFloat(inputs.boardWidth) : 0;
  const bg = result ? parseFloat(inputs.boardGap) : 0;
  const js = result ? parseFloat(inputs.joistSpacing) : 0;
  const coverage = bw + bg;

  // joists span the length (parallel to long axis), bearers span the width (perpendicular to joists)
  const joistLengthMm = deckLengthMm;
  const bearerLengthMm = deckWidthMm;
  const joistCutlist = result && joistLengthMm > 0 && joistLengthMm <= joistStock + MILL_ALLOWANCE
    ? calculateCutlist({ stockLength: joistStock, cuts: [{ length: joistLengthMm, qty: result.outputs.joistCount }], millAllowance: MILL_ALLOWANCE })
    : null;
  const bearerCutlist = result && bearerLengthMm > 0 && bearerLengthMm <= bearerStock + MILL_ALLOWANCE
    ? calculateCutlist({ stockLength: bearerStock, cuts: [{ length: bearerLengthMm, qty: result.outputs.bearerCount }], millAllowance: MILL_ALLOWANCE })
    : null;

  const joinRequired = result !== null && joistLengthMm > 6000;

  const joistJoinOptions: { at: number; piece1: number; piece2: number; cutlist: CutlistResult }[] = (() => {
    if (!joinRequired || !result) return [];
    const bs = parseFloat(inputs.bearerSpacing);
    if (!bs || bs <= 0) return [];
    const maxWithMill = 6000 + MILL_ALLOWANCE;
    const opts: { at: number; piece1: number; piece2: number; cutlist: CutlistResult }[] = [];
    for (let pos = bs; pos < joistLengthMm; pos += bs) {
      const p1 = Math.round(pos);
      const p2 = joistLengthMm - p1;
      if (p1 + 3 <= maxWithMill && p2 + 3 <= maxWithMill) {
        opts.push({
          at: p1,
          piece1: p1,
          piece2: p2,
          cutlist: calculateCutlist({
            cuts: [{ length: p1, qty: result.outputs.joistCount }, { length: p2, qty: result.outputs.joistCount }],
            millAllowance: MILL_ALLOWANCE,
          }),
        });
      }
    }
    return opts;
  })();

  const coverageDiv = Number.isFinite(deckLengthMm / coverage) ? (deckLengthMm / coverage).toFixed(1) : '—';
  const joistDiv = Number.isFinite(deckWidthMm / js) ? (deckWidthMm / js).toFixed(1) : '—';

  const deckingSteps: WorkingStep[] = result ? [
    { label: 'Deck width', explanation: 'Each board runs across this dimension (perpendicular to joists)', result: `${fmt(deckWidthMm)} mm` },
    { label: 'Board coverage', explanation: 'Each board covers its own width plus the gap to the next one', calculation: `${fmt(bw)} + ${fmt(bg)}`, result: `${fmt(coverage)} mm per board` },
    { label: 'Boards needed', explanation: 'Divide the deck length by how much each board covers', calculation: `${fmt(deckLengthMm)} ÷ ${fmt(coverage)} = ${coverageDiv}`, result: `Round up to ${fmt(result.outputs.boardCount)} boards` },
    { label: 'Joists needed', explanation: 'Divide the deck width by the joist spacing, then add one for the end', calculation: `${fmt(deckWidthMm)} ÷ ${fmt(js)} = ${joistDiv}, then + 1`, result: `${fmt(result.outputs.joistCount)} joists` },
  ] : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Decking" />

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
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Deck length" value={inputs.deckLength} onChange={set('deckLength')} units={['m', 'mm']} placeholders={{ m: 'e.g. 4.2', mm: 'e.g. 4200' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Deck width" value={inputs.deckWidth} onChange={set('deckWidth')} units={['m', 'mm']} placeholders={{ m: 'e.g. 3.6', mm: 'e.g. 3600' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board width" value={inputs.boardWidth} onChange={set('boardWidth')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 90', m: 'e.g. 0.09' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Board gap" value={inputs.boardGap} onChange={set('boardGap')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 5', m: 'e.g. 0.005' }} hint="default 5mm" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Joist spacing" value={inputs.joistSpacing} onChange={set('joistSpacing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 450', m: 'e.g. 0.45' }} hint={settings.region === 'NZ' ? 'NZS 3604' : 'AS 1684'} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NumberInput label="Bearer spacing" value={inputs.bearerSpacing} onChange={set('bearerSpacing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 1800', m: 'e.g. 1.8' }} />
            </div>
          </div>
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e' }}>{error}</p>
        )}

        {/* Calculate button */}
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

        {/* Results */}
        {result && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ResultCard label="Boards" value={fmt(result.outputs.boardCount)} accent />
                <ResultCard label="Lineal metres" value={fmt(result.outputs.totalLinealMetres)} unit="lm" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <ResultCard label="Joists" value={fmt(result.outputs.joistCount)} />
                <ResultCard label="Bearers" value={fmt(result.outputs.bearerCount)} />
                <ResultCard label="Fixings (approx)" value={fmt(result.outputs.fixingsCount)} />
              </div>
            </div>

            {persistedSuggestions && (
              <div style={{
                background: 'var(--color-card)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
                  LAST BOARD {persistedSuggestions.lastBoardWidth}mm — tap for full boards, no rip
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {persistedSuggestions.items.map(s => {
                    const active = parseFloat(inputs.boardGap) === s.gap;
                    return (
                      <button
                        key={s.boardCount}
                        onClick={() => applyGapSuggestion(active && originalGap !== null ? originalGap : s.gap)}
                        style={{
                          background: active ? 'var(--color-orange)' : 'var(--color-bg)',
                          border: `0.5px solid ${active ? 'var(--color-orange)' : 'var(--color-border)'}`,
                          borderRadius: 10,
                          padding: '8px 14px',
                          fontSize: 13,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          color: active ? '#fff' : 'var(--color-text)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{s.boardCount} boards</span>
                        <span style={{ color: active ? 'rgba(255,255,255,0.8)' : 'var(--color-muted)', fontSize: 12 }}>{s.gap}mm gap</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <ApprenticeWorking
              steps={deckingSteps}
              finalAnswer={`${result.outputs.boardCount} boards`}
              finalLabel="Total decking boards needed"
              visible={settings.apprenticeMode}
              id="decking"
              glossary={[
                { term: 'Bearer', definition: 'The main structural timber running parallel to the house, spanning from post to post. Joists sit on top of bearers.' },
                { term: 'Joist', definition: 'Secondary framing timber running perpendicular to bearers. Decking boards are fixed directly to joists.' },
                { term: 'Decking board', definition: 'The surface boards you walk on. Width and thickness vary — 90mm, 140mm are common. Gap between boards allows drainage.' },
                { term: 'Lineal metre (lm)', definition: 'A measurement of length regardless of width. Used to price and order long materials like decking and framing timber.' },
                { term: 'Board gap', definition: 'The space left between adjacent decking boards for drainage and seasonal timber movement. Typically 5–8mm.' },
              ]}
            />

            {/* Material & Cut List */}
            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>MATERIALS</p>
              {[
                { label: 'Decking boards', qty: result.outputs.boardCount, mm: deckWidthMm },
                { label: 'Joists', qty: result.outputs.joistCount, mm: joistLengthMm },
                { label: 'Bearers', qty: result.outputs.bearerCount, mm: bearerLengthMm },
                { label: 'Fixings (approx)', qty: result.outputs.fixingsCount, mm: null },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)' }}>{row.label}</span>
                  <span style={{ fontSize: 14, color: 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.mm !== null ? `${fmt(row.qty)} × ${fmt(row.mm)}mm` : `${fmt(row.qty)} screws`}
                  </span>
                </div>
              ))}

              <div style={{ height: 0.5, background: 'var(--color-border)' }} />

              {/* Joists cut list */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUT LIST — JOISTS</p>

              {joinRequired ? (
                joistJoinOptions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                    {(joistLengthMm / 1000).toFixed(1)}m span exceeds 6m — enter bearer spacing to calculate join options
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
                      {(joistLengthMm / 1000).toFixed(1)}m span — join over bearer at:
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {joistJoinOptions.map((opt, i) => (
                        <button key={opt.at} onClick={() => setSelectedJoinIdx(i)} style={{
                          flex: 1, padding: '8px 0', borderRadius: 10,
                          border: '0.5px solid var(--color-border)',
                          background: selectedJoinIdx === i ? 'var(--color-orange)' : 'var(--color-bg)',
                          color: selectedJoinIdx === i ? '#fff' : 'var(--color-text)',
                          fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                        }}>
                          {(opt.at / 1000).toFixed(1)}m
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const opt = joistJoinOptions[Math.min(selectedJoinIdx, joistJoinOptions.length - 1)];
                      if (!opt) return null;
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {opt.cutlist.materialList.map(m => {
                            const bins = opt.cutlist.plan.filter(p => p.stockLength === m.stockLength);
                            const totalWaste = bins.reduce((s, p) => s + p.waste, 0);
                            const totalStock = m.stockLength * m.count;
                            const wastePercent = parseFloat(((totalWaste / totalStock) * 100).toFixed(1));
                            return (
                              <div key={m.stockLength} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                                  {m.count} × {(m.stockLength / 1000).toFixed(1).replace(/\.0$/, '')}m lengths
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'right' as const }}>
                                  {wastePercent}% waste
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[3000, 4800, 5400, 6000].map(len => (
                      <button key={len} onClick={() => setJoistStock(len)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 10,
                        border: '0.5px solid var(--color-border)',
                        background: joistStock === len ? 'var(--color-orange)' : 'var(--color-bg)',
                        color: joistStock === len ? '#fff' : 'var(--color-text)',
                        fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                      }}>
                        {(len / 1000).toFixed(1)}m
                      </button>
                    ))}
                  </div>
                  {joistCutlist ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                        {joistCutlist.outputs.totalPieces} × {(joistStock / 1000).toFixed(1)}m lengths
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'right' as const }}>
                        {joistCutlist.plan[joistCutlist.plan.length - 1]?.waste}mm off-cut · {joistCutlist.outputs.wastePercent}% waste
                      </span>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                      Joist length ({joistLengthMm}mm) exceeds selected stock — choose a longer length above
                    </p>
                  )}
                </>
              )}

              <div style={{ height: 0.5, background: 'var(--color-border)' }} />

              {/* Bearers cut list */}
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>CUT LIST — BEARERS</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[3600, 4800, 5400, 6000].map(len => (
                  <button key={len} onClick={() => setBearerStock(len)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 10,
                    border: '0.5px solid var(--color-border)',
                    background: bearerStock === len ? 'var(--color-orange)' : 'var(--color-bg)',
                    color: bearerStock === len ? '#fff' : 'var(--color-text)',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                  }}>
                    {(len / 1000).toFixed(1)}m
                  </button>
                ))}
              </div>
              {bearerCutlist ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 500 }}>
                    {bearerCutlist.outputs.totalPieces} × {(bearerStock / 1000).toFixed(1)}m lengths
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', textAlign: 'right' as const }}>
                    {bearerCutlist.plan[bearerCutlist.plan.length - 1]?.waste}mm off-cut · {bearerCutlist.outputs.wastePercent}% waste
                  </span>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)' }}>
                  Bearer length ({bearerLengthMm}mm) exceeds selected stock — increase stock size or join over post
                </p>
              )}
            </div>

            <DeckingDiagram
              deckLength={deckLengthMm}
              deckWidth={deckWidthMm}
              boardWidth={bw}
              boardGap={bg}
              boardCount={result.outputs.boardCount}
              joistSpacing={parseFloat(inputs.joistSpacing) || undefined}
            />

            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: 'var(--color-muted)',
                lineHeight: 1.5,
              }}
            >
              {COMPLIANCE_NOTES.decking[settings.region]}
            </p>

            <AddToJobPrompt calculationId={lastEntryId} />
          </>
        )}
      </div>
    </div>
  );
}
