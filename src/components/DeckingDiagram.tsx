import { memo, useRef } from 'react';

export type DeckingDiagramProps = {
  deckLength: number;   // mm
  deckWidth: number;    // mm
  boardWidth: number;   // mm
  boardGap: number;     // mm
  boardCount: number;
  joistSpacing?: number;  // mm
  label?: string;
};

const ORANGE = '#FF5A1F';
const BLACK  = '#0a0a0a';
const FILL   = '#e8e8e6';
const FONT   = 'Inter, -apple-system, sans-serif';
const MONO   = "'JetBrains Mono','Courier New',monospace";

const VB_W = 380;
const VB_H = 320;

// Fixed deck geometry (illustrative, not proportional)
const DK_X      = 98;
const DK_Y      = 30;
const DK_W      = 206;
const DK_H      = 184;
const DK_RIGHT  = DK_X + DK_W;   // 304
const DK_BOTTOM = DK_Y + DK_H;   // 214

const MAX_VIS = 7;

export const DeckingDiagram = memo(function DeckingDiagram({
  deckLength, deckWidth, boardWidth, boardGap, boardCount,
  joistSpacing, label,
}: DeckingDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const isValid =
    deckLength > 0 && isFinite(deckLength) &&
    deckWidth  > 0 && isFinite(deckWidth)  &&
    boardWidth > 0 && isFinite(boardWidth) &&
    boardGap  >= 0 && isFinite(boardGap)   &&
    boardCount > 0 && isFinite(boardCount);

  // Joist stripes — horizontal, running parallel to deckLength (X axis),
  // spaced down the deckWidth (Y axis). Each stripe is one joist in plan view.
  const joistVisCount = joistSpacing != null && joistSpacing > 0 && deckWidth > 0
    ? Math.min(Math.floor(deckWidth / joistSpacing) + 1, MAX_VIS)
    : Math.min(5, MAX_VIS);
  const jGapH    = Math.max(4, DK_H * 0.04);
  const vJoistH  = (DK_H - jGapH * (joistVisCount - 1)) / joistVisCount;
  const joistYs: number[] = [];
  for (let i = 0; i < joistVisCount; i++) joistYs.push(DK_Y + i * (vJoistH + jGapH));

  // Boards — vertical lines crossing the joists, spaced along X (deckLength).
  // Cap visible count so a 30+ board deck doesn't render as a solid wall.
  const BOARD_VIS_MAX = 14;
  const boardVisCount = Math.min(boardCount, BOARD_VIS_MAX);
  const boardXs: number[] = [];
  const xStep = DK_W / boardVisCount;
  for (let i = 0; i < boardVisCount; i++) boardXs.push(DK_X + xStep * (i + 0.5));

  // Board dim arrow — horizontal, spans one board's width along X
  const bArrX1  = boardXs[0] - xStep * 0.4;
  const bArrX2  = boardXs[0] + xStep * 0.4;
  const bMidX   = (bArrX1 + bArrX2) / 2;

  // Width dim midpoint (vertical, left side)
  const wMidY   = (DK_Y + DK_BOTTOM) / 2;

  async function handleSave() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(VB_W));
    clone.setAttribute('height', String(VB_H));
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', '#F5F5F3');
    clone.insertBefore(bg, clone.firstChild);
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 5;
      canvas.width = VB_W * scale; canvas.height = VB_H * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(async blob => {
        if (!blob) return;
        const name = `deck-${Math.round(deckLength)}x${Math.round(deckWidth)}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Deck Layout' }); return; } catch { /**/ }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>LAYOUT PREVIEW</p>

      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-label={isValid ? `Deck layout: ${boardCount} boards, ${boardWidth}mm wide over ${deckLength}×${deckWidth}mm` : 'Deck layout preview'}
        style={{ display: 'block' }}
      >
        <title>Deck layout</title>
        <desc>{isValid ? `${boardCount} boards at ${boardWidth}mm width, ${boardGap}mm gap over ${deckLength}×${deckWidth}mm deck` : 'Enter values to see layout'}</desc>

        <defs>
          <marker id="ddS" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M8 1L2 5L8 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
          <marker id="ddE" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {!isValid ? (
          <>
            <rect x={50} y={90} width={280} height={130} rx={8} fill="#f5f5f3" />
            <text x={190} y={155} textAnchor="middle" dominantBaseline="middle"
              fontSize={13} fontFamily={FONT} fill="#999">
              Enter values to see layout
            </text>
          </>
        ) : (
          <>
            {/* Joists — horizontal stripes running parallel to deckLength */}
            {joistYs.map((y, i) => (
              <rect key={i} x={DK_X} y={y} width={DK_W} height={vJoistH}
                fill={FILL} stroke={BLACK} strokeWidth={1} />
            ))}

            {/* Boards — vertical dashed lines running perpendicular to joists (parallel to deckWidth) */}
            {boardXs.map((x, i) => (
              <line key={i} x1={x} y1={DK_Y} x2={x} y2={DK_BOTTOM}
                stroke={BLACK} strokeWidth={1} strokeDasharray="3 3" opacity={0.55} />
            ))}

            {/* Deck outer frame */}
            <rect x={DK_X} y={DK_Y} width={DK_W} height={DK_H} fill="none" stroke={BLACK} strokeWidth={3} />

            {/* Joist label — small caption on the first joist stripe */}
            <text x={DK_X + 4} y={DK_Y + vJoistH / 2 + 3} textAnchor="start"
              fontSize={9} fontFamily={FONT} fill={BLACK} opacity={0.6} letterSpacing="0.5">
              JOIST
            </text>

            {/* ── Dim 1: Deck width (left, vertical) ── */}
            <line x1={70} y1={DK_Y} x2={70} y2={DK_BOTTOM}
              stroke={ORANGE} strokeWidth={1} markerStart="url(#ddS)" markerEnd="url(#ddE)" />
            <text x={34} y={wMidY - 26} textAnchor="middle" fontSize={18} fontWeight={500} fontFamily={FONT} fill={ORANGE} letterSpacing="-0.3">Width</text>
            <text x={34} y={wMidY}      textAnchor="middle" fontSize={22} fontWeight={600} fontFamily={FONT} fill={ORANGE}>{Math.round(deckWidth)}</text>
            <text x={34} y={wMidY + 18} textAnchor="middle" fontSize={14} fontFamily={MONO} fill={ORANGE} opacity={0.72}>mm</text>

            {/* ── Dim 2: Board width (top, horizontal — boards run vertically) ── */}
            <line x1={bArrX1} y1={18} x2={bArrX2} y2={18}
              stroke={ORANGE} strokeWidth={1} markerStart="url(#ddS)" markerEnd="url(#ddE)" />
            <text x={bMidX} y={12} textAnchor="middle" fontSize={11} fontWeight={500} fontFamily={FONT} fill={ORANGE} letterSpacing="-0.2">
              Board {Math.round(boardWidth)}<tspan fontSize={9} fontFamily={MONO} opacity={0.72}> mm</tspan>
            </text>

            {/* ── Dim 3: Deck length (bottom, horizontal) ── */}
            <line x1={DK_X}     y1={DK_BOTTOM} x2={DK_X}     y2={256} stroke={ORANGE} strokeWidth={1} />
            <line x1={DK_RIGHT} y1={DK_BOTTOM} x2={DK_RIGHT} y2={256} stroke={ORANGE} strokeWidth={1} />
            <line x1={DK_X} y1={256} x2={DK_RIGHT} y2={256}
              stroke={ORANGE} strokeWidth={1} markerStart="url(#ddS)" markerEnd="url(#ddE)" />
            <line x1={DK_X}     y1={250} x2={DK_X}     y2={262} stroke={ORANGE} strokeWidth={1.5} />
            <line x1={DK_RIGHT} y1={250} x2={DK_RIGHT} y2={262} stroke={ORANGE} strokeWidth={1.5} />
            <text x={201} y={274} textAnchor="middle" fontSize={18} fontWeight={500} fontFamily={FONT} fill={ORANGE} letterSpacing="-0.3">Deck length</text>
            <text x={201} y={300} textAnchor="middle" fontSize={22} fontWeight={600} fontFamily={FONT} fill={ORANGE}>{Math.round(deckLength)}</text>
            <text x={201} y={318} textAnchor="middle" fontSize={14} fontFamily={MONO} fill={ORANGE} opacity={0.72}>mm</text>
          </>
        )}
        {label && <text x={368} y={18} textAnchor="end" fontFamily={FONT} fontSize="15" fontWeight="600" fill={BLACK} opacity={0.5}>{label}</text>}
      </svg>

      {isValid && (
        <button
          onClick={handleSave}
          style={{
            marginTop: 14, width: '100%', padding: '13px',
            border: '0.5px solid var(--color-border)', borderRadius: 12,
            background: 'var(--color-bg)', color: 'var(--color-orange)',
            fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            cursor: 'pointer', letterSpacing: '-0.2px',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.7')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Save diagram
        </button>
      )}
    </div>
  );
});
