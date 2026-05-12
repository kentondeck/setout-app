import { memo } from 'react';

interface Props {
  totalLength: number;
  balusterWidth: number;
  gap: number;
  balusterCount: number;
}

// SVG layout
const W = 320;
const POST_W = 18;
const X0 = POST_W;
const X1 = W - POST_W;
const SPAN = X1 - X0; // 284px

const ARROW_Y = 14;
const RAIL_T = 27;
const RAIL_H = 7;
const BODY_T = RAIL_T + RAIL_H; // 34
const BODY_B = BODY_T + 54;     // 88
const RAIL_B = BODY_B;
const GAP_Y = RAIL_B + RAIL_H + 13; // 108
const SVG_H = GAP_Y + 28;           // 136

const C_DARK = '#0a0a0a';
const C_BAL = '#999999';
const C_DIM = '#FF5A1F';
const C_BG = '#f5f5f3';
const C_IND = '#e0e0de';
const FONT = 'Inter, -apple-system, sans-serif';

const MAX_DRAW = 18;
const MIN_B_PX = 2;
const SHOW_SIDE = 5;

interface DimArrowProps {
  x1: number; y: number; x2: number;
  label: string; below?: boolean;
}

function DimArrow({ x1, y, x2, label, below = false }: DimArrowProps) {
  const dist = x2 - x1;
  const isNarrow = dist < 45;
  const midX = (x1 + x2) / 2;
  const labelX = isNarrow ? x2 + 4 : midX;
  const anchor = isNarrow ? 'start' : 'middle';
  const labelY = below ? y + 14 : y - 5;
  const AW = 5; const AH = 3;

  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C_DIM} strokeWidth="1" />
      <line x1={x1} y1={y - 4} x2={x1} y2={y + 4} stroke={C_DIM} strokeWidth="1" />
      <line x1={x2} y1={y - 4} x2={x2} y2={y + 4} stroke={C_DIM} strokeWidth="1" />
      {dist >= 16 && (
        <>
          <polygon points={`${x1},${y} ${x1 + AW},${y - AH} ${x1 + AW},${y + AH}`} fill={C_DIM} />
          <polygon points={`${x2},${y} ${x2 - AW},${y - AH} ${x2 - AW},${y + AH}`} fill={C_DIM} />
        </>
      )}
      <text x={labelX} y={labelY} textAnchor={anchor} fontSize="10" fontWeight="500" fontFamily={FONT} fill={C_DIM}>
        {label}
      </text>
    </g>
  );
}

type BalEl = { kind: 'bal'; x: number };
type IndEl = { kind: 'ind'; x: number; w: number; count: number };
type El = BalEl | IndEl;

export const BalusterDiagram = memo(function BalusterDiagram({
  totalLength, balusterWidth, gap, balusterCount,
}: Props) {
  const isValid = totalLength > 0 && balusterWidth > 0 && gap > 0 && balusterCount > 0;

  if (!isValid) {
    return (
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Layout preview
        </p>
        <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, color: '#ccc' }}>Enter values to see layout</span>
        </div>
      </div>
    );
  }

  const scale = SPAN / totalLength;
  const b = balusterWidth * scale;
  const g = gap * scale;

  const truncated = balusterCount > MAX_DRAW || b < MIN_B_PX;
  const effectiveSide = Math.min(SHOW_SIDE, Math.floor(balusterCount / 2));

  const els: El[] = [];

  if (!truncated) {
    for (let j = 0; j < balusterCount; j++) {
      els.push({ kind: 'bal', x: X0 + g + j * (b + g) });
    }
  } else {
    for (let j = 0; j < effectiveSide; j++) {
      els.push({ kind: 'bal', x: X0 + g + j * (b + g) });
    }
    const lastJ = balusterCount - effectiveSide;
    const indX = X0 + g + effectiveSide * (b + g);
    const lastX = X0 + g + lastJ * (b + g);
    const hiddenCount = balusterCount - 2 * effectiveSide;
    if (hiddenCount > 0 && lastX > indX + 1) {
      els.push({ kind: 'ind', x: indX, w: lastX - indX, count: hiddenCount });
    }
    for (let j = lastJ; j < balusterCount; j++) {
      els.push({ kind: 'bal', x: X0 + g + j * (b + g) });
    }
  }

  const drawB = Math.max(b, MIN_B_PX);
  const firstBal = els.find((e): e is BalEl => e.kind === 'bal');
  const gapArrowEnd = firstBal?.x ?? X0 + g;

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 16 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Layout preview
      </p>
      <svg
        viewBox={`0 0 ${W} ${SVG_H}`}
        width="100%"
        style={{ display: 'block' }}
        aria-label={`Baluster layout: ${balusterCount} balusters at ${gap}mm gap across ${totalLength}mm`}
      >
        {/* Total length arrow */}
        <DimArrow x1={X0} y={ARROW_Y} x2={X1} label={`Total: ${totalLength}mm`} />

        {/* Top rail */}
        <rect x={0} y={RAIL_T} width={W} height={RAIL_H} fill={C_DARK} />

        {/* Span background */}
        <rect x={X0} y={BODY_T} width={SPAN} height={BODY_B - BODY_T} fill={C_BG} />

        {/* Elements */}
        {els.map((el, i) => {
          if (el.kind === 'ind') {
            return (
              <g key={i}>
                <rect x={el.x} y={BODY_T} width={el.w} height={BODY_B - BODY_T} fill={C_IND} />
                <text
                  x={el.x + el.w / 2} y={(BODY_T + BODY_B) / 2 + 4}
                  textAnchor="middle" fontSize="10" fontWeight="500" fontFamily={FONT} fill="#999"
                >
                  +{el.count} more
                </text>
              </g>
            );
          }
          return (
            <rect
              key={i}
              x={el.x} y={BODY_T + 2}
              width={drawB} height={BODY_B - BODY_T - 4}
              fill={C_BAL} stroke={C_DARK} strokeWidth="0.5"
            />
          );
        })}

        {/* Posts (over span bg) */}
        <rect x={0} y={BODY_T} width={POST_W} height={BODY_B - BODY_T} fill={C_DARK} />
        <rect x={X1} y={BODY_T} width={POST_W} height={BODY_B - BODY_T} fill={C_DARK} />

        {/* Bottom rail */}
        <rect x={0} y={RAIL_B} width={W} height={RAIL_H} fill={C_DARK} />

        {/* Gap arrow */}
        <DimArrow x1={X0} y={GAP_Y} x2={gapArrowEnd} label={`${gap}mm`} below={true} />
      </svg>
      <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--color-muted)', textAlign: 'center' }}>
        Approximate — check measurements before cutting
      </p>
    </div>
  );
});
