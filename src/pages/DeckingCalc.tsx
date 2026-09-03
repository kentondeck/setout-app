import { useState, useContext } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { NumberInput } from '../components/NumberInput';
import { ApprenticeWorking } from '../components/ApprenticeWorking';
import { AddToJobPrompt } from '../components/AddToJobPrompt';
import { ShareCalcButton } from '../components/ShareCalcButton';
import { ResultHero, ShoppingList, AddToQuoteCTA, buildShoppingListShareBody } from '../components/CalcResult';
import { calculateDecking } from '../calculators/decking';
import type { DeckingResult, GapSuggestion } from '../calculators/decking';
import type { WorkingStep } from '../components/ApprenticeWorking';
import { useScrollToResult } from '../lib/useScrollToResult';
import { COMPLIANCE_NOTES } from '../lib/compliance';
import { SettingsContext, HistoryContext } from '../contexts';
import { DeckingDiagram } from '../components/DeckingDiagram';
import { JobNameInput } from '../components/JobNameInput';
import { uuid } from '../lib/uuid';

interface Inputs {
  deckLength: string;
  deckWidth: string;
  boardWidth: string;
  boardGap: string;
  joistSpacing: string;
  bearerSpacing: string;
}

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
  const [lastEntryId, setLastEntryId] = useState('');
  const [error, setError] = useState('');
  const [jobName, setJobName] = useState('');
  const [persistedSuggestions, setPersistedSuggestions] = useState<{ items: GapSuggestion[]; lastBoardWidth: number } | null>(null);
  const [originalGap, setOriginalGap] = useState<number | null>(null);
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

    setPersistedSuggestions(
      calc.gapSuggestions.length > 0
        ? { items: calc.gapSuggestions, lastBoardWidth: calc.lastBoardWidth }
        : null
    );
    setOriginalGap(boardGap);

    const id = uuid();
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
  // Board gap defaults to 5mm when input left blank — mirror the calc's fallback
  // so the diagram doesn't disappear just because the user didn't type a gap.
  const bgRaw = result ? parseFloat(inputs.boardGap) : 0;
  const bg = result && (!isFinite(bgRaw) || bgRaw < 0) ? 5 : bgRaw;
  const js = result ? parseFloat(inputs.joistSpacing) : 0;
  const coverage = bw + bg;

  // joists span the length (parallel to long axis), bearers span the width (perpendicular to joists)
  const joistLengthMm = deckLengthMm;
  const bearerLengthMm = deckWidthMm;

  const coverageDiv = Number.isFinite(deckLengthMm / coverage) ? (deckLengthMm / coverage).toFixed(1) : '—';
  const joistDiv = Number.isFinite(deckWidthMm / js) ? (deckWidthMm / js).toFixed(1) : '—';

  // Boards + bearers span deck WIDTH, joists span deck LENGTH. Any span > 6m
  // (max stock length) needs to be joined into multiple pieces per run — so the
  // physical count you order is member-count × pieces-per-run, not member-count.
  const MAX_STOCK_MM = 6000;
  const piecesPerRun = (spanMm: number): number => (spanMm > 0 ? Math.ceil(spanMm / MAX_STOCK_MM) : 1);
  // orderBreakdown returns the actual stock lengths to buy, multiplied out
  // by the number of runs — e.g. for a 9.4m span across 35 rows it gives
  // "35 × 6.0m + 35 × 3.4m". When only one piece per run, it collapses to
  // "35 × 4.2m each". Groups equal lengths together (e.g. 12m span across
  // 4 runs = 8 × 6.0m, not 4 × 6.0m + 4 × 6.0m).
  const orderBreakdown = (spanMm: number, pieces: number, memberCount: number): string => {
    if (pieces <= 1) return `${memberCount} × ${(spanMm / 1000).toFixed(2)}m each`;
    const wholes = pieces - 1;
    const remainder = spanMm - wholes * MAX_STOCK_MM;
    // Group by length so identical-length pieces roll up
    const counts = new Map<number, number>();
    for (let i = 0; i < wholes; i++) counts.set(MAX_STOCK_MM, (counts.get(MAX_STOCK_MM) ?? 0) + memberCount);
    counts.set(remainder, (counts.get(remainder) ?? 0) + memberCount);
    return [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([lenMm, qty]) => `${qty} × ${(lenMm / 1000).toFixed(2)}m`)
      .join(' + ');
  };
  const boardPieces = piecesPerRun(deckWidthMm);
  const joistPieces = piecesPerRun(joistLengthMm);
  const bearerPieces = piecesPerRun(bearerLengthMm);
  const anyJoinNeeded = boardPieces > 1 || joistPieces > 1 || bearerPieces > 1;

  const deckingSteps: WorkingStep[] = result ? [
    { label: 'Deck width', explanation: 'Each board runs across this dimension (perpendicular to joists)', result: `${fmt(deckWidthMm)} mm` },
    { label: 'Board coverage', explanation: 'Each board covers its own width plus the gap to the next one', calculation: `${fmt(bw)} + ${fmt(bg)}`, result: `${fmt(coverage)} mm per board` },
    { label: 'Boards needed', explanation: 'Divide the deck length by how much each board covers', calculation: `${fmt(deckLengthMm)} ÷ ${fmt(coverage)} = ${coverageDiv}`, result: `Round up to ${fmt(result.outputs.boardCount)} rows` },
    ...(boardPieces > 1 ? [{
      label: 'Boards need joining',
      explanation: `Each row spans ${(deckWidthMm / 1000).toFixed(2)}m but max stock is 6.0m — each row needs to be joined from multiple lengths`,
      calculation: `${result.outputs.boardCount} rows × ${boardPieces} pieces = ${result.outputs.boardCount * boardPieces} boards to buy`,
      result: `${result.outputs.boardCount * boardPieces} pieces total — ${orderBreakdown(deckWidthMm, boardPieces, result.outputs.boardCount)}`,
    } as WorkingStep] : []),
    { label: 'Joists needed', explanation: 'Divide the deck width by the joist spacing, then add one for the end', calculation: `${fmt(deckWidthMm)} ÷ ${fmt(js)} = ${joistDiv}, then + 1`, result: `${fmt(result.outputs.joistCount)} joists` },
  ] : [];

  const joistLinealM = result ? parseFloat((result.outputs.joistCount * (joistLengthMm / 1000)).toFixed(1)) : 0;
  const bearerLinealM = result ? parseFloat((result.outputs.bearerCount * (bearerLengthMm / 1000)).toFixed(1)) : 0;
  const screwBoxes = result ? Math.ceil(result.outputs.fixingsCount / DECKING_SCREWS_PER_BOX) : 0;

  const quoteMaterials = result ? [
    {
      item: `${bw}mm decking board`,
      quantity: result.outputs.totalLinealMetres,
      unit: 'lineal metre',
      note: boardPieces > 1
        ? `${result.outputs.boardCount * boardPieces} pieces — ${orderBreakdown(deckWidthMm, boardPieces, result.outputs.boardCount)}`
        : `${result.outputs.boardCount} boards × ${deckWidthMm}mm`,
    },
    {
      item: 'Joist (treated pine)',
      quantity: joistLinealM,
      unit: 'lineal metre',
      note: joistPieces > 1
        ? `${result.outputs.joistCount * joistPieces} pieces — ${orderBreakdown(joistLengthMm, joistPieces, result.outputs.joistCount)}`
        : `${result.outputs.joistCount} × ${(joistLengthMm / 1000).toFixed(1)}m`,
    },
    {
      item: 'Bearer (treated pine)',
      quantity: bearerLinealM,
      unit: 'lineal metre',
      note: bearerPieces > 1
        ? `${result.outputs.bearerCount * bearerPieces} pieces — ${orderBreakdown(bearerLengthMm, bearerPieces, result.outputs.bearerCount)}`
        : `${result.outputs.bearerCount} × ${(bearerLengthMm / 1000).toFixed(1)}m`,
    },
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
        {result && (() => {
          // Everything a tradie needs to see at a glance
          const deckAreaM2 = parseFloat(((deckLengthMm * deckWidthMm) / 1_000_000).toFixed(1));
          const boardsToBuy = result.outputs.boardCount * boardPieces;
          const specLine = boardPieces > 1
            ? `${bw}mm decking · mixed lengths`
            : `${bw}mm decking · ${(deckWidthMm / 1000).toFixed(2)}m each`;

          // The shopping list — same data as the old Order This card, restyled
          const shopRows = [
            boardOrderMode === 'rlp'
              ? {
                  qty: `${(result.outputs.totalLinealMetres * (1 + RLP_BUFFER_PCT / 100)).toFixed(1)}`,
                  name: `${bw}mm decking · random length pack`,
                  meta: `${fmt(result.outputs.totalLinealMetres)} lm + ${RLP_BUFFER_PCT}% buffer · assorted 2.4–6.0m`,
                }
              : {
                  qty: fmt(boardsToBuy),
                  name: `${bw}mm decking${boardPieces > 1 ? ` · ${boardPieces} per row` : ''}`,
                  meta: `${orderBreakdown(deckWidthMm, boardPieces, result.outputs.boardCount)} · ${fmt(result.outputs.totalLinealMetres)} lm`,
                },
            {
              qty: fmt(result.outputs.joistCount * joistPieces),
              name: joistPieces > 1 ? `Joists · ${joistPieces} per run` : 'Joists',
              meta: `${orderBreakdown(joistLengthMm, joistPieces, result.outputs.joistCount)} · ${fmt(joistLinealM)} lm`,
            },
            {
              qty: fmt(result.outputs.bearerCount * bearerPieces),
              name: bearerPieces > 1 ? `Bearers · ${bearerPieces} per run` : 'Bearers',
              meta: `${orderBreakdown(bearerLengthMm, bearerPieces, result.outputs.bearerCount)} · ${fmt(bearerLinealM)} lm`,
            },
            {
              qty: fmt(result.outputs.fixingsCount),
              name: 'Decking screws',
              meta: `${screwBoxes} × ${DECKING_SCREWS_PER_BOX} box${screwBoxes === 1 ? '' : 'es'}`,
            },
          ];

          const rlpToggle = (
            <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 8, padding: 2, gap: 2 }}>
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
                      padding: '4px 10px', borderRadius: 6, border: 'none',
                      background: active ? 'var(--color-card)' : 'transparent',
                      color: active ? 'var(--color-text)' : 'var(--color-muted)',
                      fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          );

          return (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <ResultHero
              label="You'll need"
              value={boardsToBuy}
              unit="boards"
              spec={specLine}
              stats={[
                { label: `${deckAreaM2} m²` },
                { label: `${result.outputs.totalLinealMetres} lm` },
                { label: `${result.outputs.joistCount} joists` },
                { label: `${result.outputs.bearerCount} bearers` },
              ]}
            />

            <ShoppingList
              rows={shopRows}
              rightSlot={rlpToggle}
              noteSlot={anyJoinNeeded && boardOrderMode === 'fixed' ? (
                <span style={{ fontSize: 10.5, color: 'var(--color-muted)' }}>· some runs joined</span>
              ) : null}
            />

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

            <AddToQuoteCTA
              scopeSummary={`Deck, ${inputs.deckLength}m × ${inputs.deckWidth}m`}
              materials={quoteMaterials}
              jobName={jobName}
            />

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
                Save
              </p>
              <JobNameInput value={jobName} onChange={setJobName} onSave={name => updateEntry(lastEntryId, { jobName: name })} />
              <AddToJobPrompt calculationId={lastEntryId} />
              <ShareCalcButton
                calculationId={lastEntryId}
                shareTitle={jobName || 'Decking order'}
                shareBody={buildShoppingListShareBody({
                  jobName,
                  scopeSummary: `${inputs.deckLength}m × ${inputs.deckWidth}m deck`,
                  rows: shopRows,
                })}
              />
            </div>
          </div>
          );
        })()}
      </div>
    </div>
  );
}
