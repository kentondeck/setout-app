import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { AddToQuoteButton } from '../components/AddToQuoteButton';
import { calculateDecking } from '../calculators/decking';
import type { DeckingResult, GapSuggestion } from '../calculators/decking';
import { calculateCutlist } from '../calculators/cutlist';
import type { CutlistResult } from '../calculators/cutlist';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { useScrollToResult } from '../lib/useScrollToResult';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { DeckingDiagram } from '../components/DeckingDiagram';
import { JobNameInput } from '../components/JobNameInput';

interface Inputs {
  deckLength: string;
  deckWidth: string;
  boardWidth: string;
  boardGap: string;
  joistSpacing: string;
  bearerSpacing: string;
}

const MILL_ALLOWANCE = 10;
const DECKING_SCREWS_PER_BOX = 500; // typical trade box of decking screws

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
  const { addEntry, updateEntry } = useContext(HistoryContext);

  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<DeckingResult | null>(null);
  const resultRef = useScrollToResult(result);
  const [joistStock, setJoistStock] = useState(4800);
  const [bearerStock, setBearerStock] = useState(4800);
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');
  const [persistedSuggestions, setPersistedSuggestions] = useState<{ items: GapSuggestion[]; lastBoardWidth: number } | null>(null);
  const [originalGap, setOriginalGap] = useState<number | null>(null);
  const [selectedJoinIdx, setSelectedJoinIdx] = useState(0);
  const [boardOrderMode, setBoardOrderMode] = useState<'fixed' | 'rlp'>('fixed');
  const RLP_BUFFER_PCT = 10;

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

  const joistLinealM = result ? parseFloat((result.outputs.joistCount * (joistLengthMm / 1000)).toFixed(1)) : 0;
  const bearerLinealM = result ? parseFloat((result.outputs.bearerCount * (bearerLengthMm / 1000)).toFixed(1)) : 0;
  const screwBoxes = result ? Math.ceil(result.outputs.fixingsCount / DECKING_SCREWS_PER_BOX) : 0;

  // Boards + bearers span deck WIDTH, joists span deck LENGTH. Any span > 6m
  // (max stock length) needs to be joined into multiple pieces per run — so the
  // physical count you order is member-count × pieces-per-run, not member-count.
  const MAX_STOCK_MM = 6000;
  const piecesPerRun = (spanMm: number): number => (spanMm > 0 ? Math.ceil(spanMm / MAX_STOCK_MM) : 1);
  const runBreakdown = (spanMm: number, pieces: number): string => {
    if (pieces <= 1) return `${(spanMm / 1000).toFixed(2)}m each`;
    // Default split: N-1 full 6m pieces + one remainder. User can retune in the cut list below.
    const wholes = pieces - 1;
    const remainder = spanMm - wholes * MAX_STOCK_MM;
    const parts = [
      ...Array(wholes).fill(`${(MAX_STOCK_MM / 1000).toFixed(2)}m`),
      `${(remainder / 1000).toFixed(2)}m`,
    ];
    return `${parts.join(' + ')} per run`;
  };
  const boardPieces = piecesPerRun(deckWidthMm);
  const joistPieces = piecesPerRun(joistLengthMm);
  const bearerPieces = piecesPerRun(bearerLengthMm);
  const anyJoinNeeded = boardPieces > 1 || joistPieces > 1 || bearerPieces > 1;

  const quoteMaterials = result ? [
    { item: `${bw}mm decking board`, quantity: result.outputs.totalLinealMetres, unit: 'lineal metre', note: `${result.outputs.boardCount} boards × ${deckWidthMm}mm` },
    { item: 'Joist (treated pine)', quantity: joistLinealM, unit: 'lineal metre', note: `${result.outputs.joistCount} × ${(joistLengthMm / 1000).toFixed(1)}m` },
    { item: 'Bearer (treated pine)', quantity: bearerLinealM, unit: 'lineal metre', note: `${result.outputs.bearerCount} × ${(bearerLengthMm / 1000).toFixed(1)}m` },
    { item: 'Decking screws', quantity: screwBoxes, unit: 'box', note: `${result.outputs.fixingsCount} screws` },
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
              <NumberInput label="Bearer spacing" value={inputs.bearerSpacing} onChange={set('bearerSpacing')} units={['mm', 'm']} placeholders={{ mm: 'e.g. 1300', m: 'e.g. 1.3' }} />
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
          <div ref={resultRef}>
            {/* "Order this" card — every material a chippie needs at the yard, together */}
            <div style={{
              background: 'var(--color-orange)',
              color: '#fff',
              borderRadius: 'var(--radius-card)',
              padding: '14px 16px',
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              fontVariantNumeric: 'tabular-nums',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)' }}>
                    Order this
                  </span>
                  {anyJoinNeeded && boardOrderMode === 'fixed' && (
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.72)' }}>
                      · some runs joined
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.14)', borderRadius: 8, padding: 2, gap: 2 }}>
                  {([
                    { key: 'fixed', label: 'Fixed' },
                    { key: 'rlp', label: 'RLP' },
                  ] as const).map(t => {
                    const active = boardOrderMode === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setBoardOrderMode(t.key)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: 'none',
                          background: active ? '#fff' : 'transparent',
                          color: active ? 'var(--color-orange)' : 'rgba(255,255,255,0.85)',
                          fontSize: 11,
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          letterSpacing: '-0.1px',
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {[
                boardOrderMode === 'rlp' ? {
                  qty: `${(result.outputs.totalLinealMetres * (1 + RLP_BUFFER_PCT / 100)).toFixed(1)}`,
                  unit: 'lm (RLP)',
                  detail: `${fmt(result.outputs.totalLinealMetres)} lm + ${RLP_BUFFER_PCT}% buffer · ${fmt(bw)}mm × assorted 2.4–6.0m`,
                } : {
                  qty: fmt(result.outputs.boardCount * boardPieces),
                  unit: boardPieces > 1 ? `boards (${boardPieces} per row)` : 'boards',
                  detail: `${fmt(bw)}mm · ${runBreakdown(deckWidthMm, boardPieces)} · ${fmt(result.outputs.totalLinealMetres)} lm`,
                },
                {
                  qty: fmt(result.outputs.joistCount * joistPieces),
                  unit: joistPieces > 1 ? `joists (${joistPieces} per run)` : 'joists',
                  detail: `${runBreakdown(joistLengthMm, joistPieces)} · ${fmt(joistLinealM)} lm`,
                },
                {
                  qty: fmt(result.outputs.bearerCount * bearerPieces),
                  unit: bearerPieces > 1 ? `bearers (${bearerPieces} per run)` : 'bearers',
                  detail: `${runBreakdown(bearerLengthMm, bearerPieces)} · ${fmt(bearerLinealM)} lm`,
                },
                {
                  qty: fmt(result.outputs.fixingsCount),
                  unit: 'screws',
                  detail: `${screwBoxes} × ${DECKING_SCREWS_PER_BOX} box${screwBoxes === 1 ? '' : 'es'}`,
                },
              ].map((row, i, arr) => (
                <div
                  key={row.unit}
                  style={{
                    padding: '7px 0',
                    borderBottom: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.18)' : 'none',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.3px', lineHeight: 1, minWidth: 44 }}>{row.qty}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>{row.unit}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginLeft: 'auto', textAlign: 'right' }}>{row.detail}</span>
                </div>
              ))}
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

            {/* Cut List */}
            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>

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
              label={jobName}
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

            <div style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Save &amp; share
              </p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastEntryId} />
              <AddToQuoteButton
                scopeSummary={`Deck, ${inputs.deckLength}m × ${inputs.deckWidth}m`}
                materials={quoteMaterials}
                jobName={jobName}
              />
              <ShareCalcButton calculationId={lastEntryId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
