import { memo } from 'react';

export interface DeckBlueprintProps {
  deckLengthM: number;
  deckWidthM: number;
  boardWidthMm: number;
  boardGapMm: number;
  boardCount: number;
  joistCount: number;
}

// ─── Layout constants ───────────────────────────────────────────────────────
const SVG_W = 340;
const ML = 54;         // left margin — room for rotated width label
const MT = 36;         // top margin  — room for length label
const MR = 14;         // right margin
const MB = 24;         // bottom margin — room for caption
const DRAW_W = SVG_W - ML - MR;   // 272 px
const MAX_DRAW_H = 186;

// ─── Colours ────────────────────────────────────────────────────────────────
const ORANGE     = '#FF5A1F';
const BOARD_FILL = '#ddc9b0';
const BOARD_EDGE = '#c4ad94';
const DECK_BG    = '#f5ede2';
const JOIST_CLR  = 'rgba(0,0,0,0.18)';
const OUTLINE    = '#1a1a1a';

// ─── Horizontal dimension annotation ────────────────────────────────────────
function HDim({
  x1, x2, y, deckY, label,
}: { x1: number; x2: number; y: number; deckY: number; label: string }) {
  const mid = (x1 + x2) / 2;
  return (
    <g>
      {/* thin extension lines down to deck edge */}
      <line x1={x1} y1={y + 5} x2={x1} y2={deckY} stroke={ORANGE} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.45} />
      <line x1={x2} y1={y + 5} x2={x2} y2={deckY} stroke={ORANGE} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.45} />
      {/* tick marks */}
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={ORANGE} strokeWidth={1.2} />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={ORANGE} strokeWidth={1.2} />
      {/* dimension line */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={ORANGE} strokeWidth={0.8} />
      {/* label */}
      <text x={mid} y={y - 7} textAnchor="middle" fontSize={10} fill={ORANGE}
        fontFamily="Inter, system-ui, sans-serif" fontWeight="500">
        {label}
      </text>
    </g>
  );
}

// ─── Vertical dimension annotation ──────────────────────────────────────────
function VDim({
  y1, y2, x, label,
}: { y1: number; y2: number; x: number; label: string }) {
  const mid = (y1 + y2) / 2;
  return (
    <g>
      {/* tick marks */}
      <line x1={x - 4} y1={y1} x2={x + 4} y2={y1} stroke={ORANGE} strokeWidth={1.2} />
      <line x1={x - 4} y1={y2} x2={x + 4} y2={y2} stroke={ORANGE} strokeWidth={1.2} />
      {/* dimension line */}
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={ORANGE} strokeWidth={0.8} />
      {/* rotated label */}
      <text
        x={x} y={mid}
        textAnchor="middle"
        fontSize={10}
        fill={ORANGE}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        transform={`rotate(-90 ${x} ${mid})`}
      >
        {label}
      </text>
    </g>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export const DeckBlueprint = memo(function DeckBlueprint({
  deckLengthM,
  deckWidthM,
  boardWidthMm,
  boardGapMm,
  boardCount,
  joistCount,
}: DeckBlueprintProps) {
  const deckLengthMm = Math.round(deckLengthM * 1000);
  const deckWidthMm  = Math.round(deckWidthM  * 1000);

  // Scale to fit within the available draw area
  const scaleH = DRAW_W    / deckLengthMm;
  const scaleV = MAX_DRAW_H / deckWidthMm;
  const scale  = Math.min(scaleH, scaleV);

  const drawW = deckLengthMm * scale;
  const drawH = deckWidthMm  * scale;

  // Centre horizontally if height was the limiting dimension
  const x0 = ML + (DRAW_W - drawW) / 2;
  const y0 = MT;

  const SVG_H = drawH + MT + MB;

  const boardH = boardWidthMm * scale;
  const pitch  = (boardWidthMm + boardGapMm) * scale;
  const showBoards = boardH >= 1.5;

  // Joist x-positions along the length
  const joistXs = Array.from({ length: joistCount }, (_, i) =>
    x0 + (joistCount > 1 ? (i / (joistCount - 1)) * drawW : drawW / 2)
  );

  const caption = `${boardCount} boards · ${joistCount} joists · ${boardWidthMm}mm boards, ${boardGapMm}mm gap`;

  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px',
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500 }}>
        PLAN VIEW
      </p>

      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        style={{ display: 'block' }}
        aria-label="Deck plan view"
      >
        <defs>
          <pattern id="deck-hatch" patternUnits="userSpaceOnUse" width={10} height={10}>
            <line x1={0} y1={10} x2={10} y2={0} stroke={BOARD_EDGE} strokeWidth={1.2} />
          </pattern>
        </defs>

        {/* ── Deck fill ── */}
        <rect x={x0} y={y0} width={drawW} height={drawH} fill={DECK_BG} />

        {/* ── Individual boards (or hatch if too small) ── */}
        {showBoards
          ? Array.from({ length: boardCount }, (_, i) => {
              const by = y0 + i * pitch;
              const bh = Math.min(boardH, y0 + drawH - by);
              if (bh <= 0) return null;
              return (
                <rect key={i} x={x0} y={by} width={drawW} height={bh}
                  fill={BOARD_FILL} stroke={BOARD_EDGE} strokeWidth={0.5} />
              );
            })
          : <rect x={x0} y={y0} width={drawW} height={drawH} fill="url(#deck-hatch)" />
        }

        {/* ── Joist lines ── */}
        {joistXs.map((jx, i) => (
          <line key={i} x1={jx} y1={y0} x2={jx} y2={y0 + drawH}
            stroke={JOIST_CLR} strokeWidth={1} strokeDasharray="4,3" />
        ))}

        {/* ── Deck outline ── */}
        <rect x={x0} y={y0} width={drawW} height={drawH}
          fill="none" stroke={OUTLINE} strokeWidth={1.5} />

        {/* ── Dimension: length (top) ── */}
        <HDim x1={x0} x2={x0 + drawW} y={MT - 14} deckY={y0} label={`${deckLengthMm}mm`} />

        {/* ── Dimension: width (left) ── */}
        <VDim y1={y0} y2={y0 + drawH} x={x0 - 16} label={`${deckWidthMm}mm`} />

        {/* ── Caption below ── */}
        <text
          x={x0 + drawW / 2}
          y={y0 + drawH + 16}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-muted)"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {caption}
        </text>
      </svg>
    </div>
  );
});
