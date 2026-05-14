import { memo } from 'react';

export type BalusterDiagramProps = {
  totalLength: number;
  balusterWidth: number;
  balusterCount: number;
  gap: number;
};

// ── Design tokens (locked Setout diagram brand) ───────────────────────────────
const ORANGE = '#FF5A1F';
const BLACK = '#0a0a0a';
const MUTED = '#999';
const STRUCT_FILL = '#e8e8e6';
const FONT = 'Inter, -apple-system, sans-serif';
const MONO = "'JetBrains Mono','Courier New',monospace";

// ── Structure geometry (px — illustrative, not proportional) ──────────────────
const POST_W = 14;
const L_POST = 88;                        // left edge of left post
const R_POST = 278;                       // left edge of right post
const SPAN_START = L_POST + POST_W;       // 102 — right face of left post
const SPAN_END = R_POST;                  // 278 — left face of right post
const SPAN_PX = SPAN_END - SPAN_START;    // 176
const RAIL_W = R_POST + POST_W - L_POST;  // 204 — full outer width

const TOP_RAIL_Y = 52;
const TOP_RAIL_H = 10;
const BOT_RAIL_Y = 190;
const BOT_RAIL_H = 10;
const BAL_TOP = TOP_RAIL_Y + TOP_RAIL_H;  // 62
const BAL_BOTTOM = BOT_RAIL_Y;            // 190
const BAL_H = BAL_BOTTOM - BAL_TOP;       // 128
const GROUND_Y = 216;
const GL = 68;   // ground line left x
const GR = 312;  // ground line right x
const HATCH_DEPTH = 22;

// ── Baluster cap ──────────────────────────────────────────────────────────────
const MAX_VIS = 10;

// ── Ground hatch lines ────────────────────────────────────────────────────────
function hatchLines(x1: number, x2: number, y: number, depth: number) {
  const angle = 35 * Math.PI / 180;
  const step = 8 / Math.sin(angle);       // spacing between parallel lines
  const run = depth / Math.tan(angle);    // horizontal run for full depth
  const els: React.ReactElement[] = [];
  for (let s = -run; s <= (x2 - x1) + step; s += step) {
    els.push(
      <line
        key={s.toFixed(1)}
        x1={x1 + s} y1={y + depth}
        x2={x1 + s + run} y2={y}
        stroke={BLACK} strokeWidth={0.5}
      />
    );
  }
  return els;
}

// ── Stacked dimension label (caption / big number / "mm") ─────────────────────
function DimLabel({
  caption, value, cx, cy, anchor = 'middle',
}: { caption: string; value: number; cx: number; cy: number; anchor?: 'middle' | 'start' | 'end' }) {
  return (
    <g>
      <text x={cx} y={cy} textAnchor={anchor} fontSize={18} fontWeight={500} fontFamily={FONT} fill={ORANGE} letterSpacing="-0.3">
        {caption}
      </text>
      <text x={cx} y={cy + 26} textAnchor={anchor} fontSize={22} fontWeight={600} fontFamily={FONT} fill={ORANGE}>
        {value}
      </text>
      <text x={cx} y={cy + 44} textAnchor={anchor} fontSize={14} fontFamily={MONO} fill={ORANGE} opacity={0.72}>
        mm
      </text>
    </g>
  );
}

// ── Dimension arrow (horizontal, with flat ticks) ─────────────────────────────
function HorizDim({
  x1, x2, y, markerId,
}: { x1: number; x2: number; y: number; markerId: string }) {
  const startId = `${markerId}S`;
  const endId = `${markerId}E`;
  return (
    <g>
      <line
        x1={x1} y1={y} x2={x2} y2={y}
        stroke={ORANGE} strokeWidth={1}
        markerStart={`url(#${startId})`} markerEnd={`url(#${endId})`}
      />
      {/* flat perpendicular ticks */}
      <line x1={x1} y1={y - 6} x2={x1} y2={y + 6} stroke={ORANGE} strokeWidth={1.5} />
      <line x1={x2} y1={y - 6} x2={x2} y2={y + 6} stroke={ORANGE} strokeWidth={1.5} />
    </g>
  );
}

export const BalusterDiagram = memo(function BalusterDiagram({
  totalLength, balusterWidth, balusterCount, gap,
}: BalusterDiagramProps) {
  const isValid =
    totalLength > 0 && isFinite(totalLength) &&
    balusterWidth > 0 && isFinite(balusterWidth) &&
    balusterCount > 0 && isFinite(balusterCount) &&
    gap > 0 && isFinite(gap);

  const wrap = (svg: React.ReactNode) => (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 20 }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: BLACK }}>Layout preview</p>
      {svg}
      <p style={{ margin: '8px 0 0', fontSize: 11, color: MUTED, textAlign: 'center' }}>
        Approximate. Check measurements before cutting.
      </p>
    </div>
  );

  if (!isValid) {
    return wrap(
      <svg viewBox="0 0 380 320" width="100%" role="img" style={{ display: 'block' }}>
        <title>Baluster spacing layout</title>
        <desc>Enter values to see layout</desc>
        <rect x={50} y={90} width={280} height={130} rx={8} fill="#f5f5f3" />
        <text x={190} y={155} textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontFamily={FONT} fill={MUTED}>
          Enter values to see layout
        </text>
      </svg>
    );
  }

  // ── Baluster visual layout ─────────────────────────────────────────────────
  const visibleCount = Math.min(balusterCount, MAX_VIS);

  const vbw = Math.max(6, Math.min(12, SPAN_PX / (visibleCount * 2.5)));
  const vg = Math.max(0, (SPAN_PX - visibleCount * vbw) / (visibleCount + 1));

  const positions: number[] = [];
  for (let i = 0; i < visibleCount; i++) {
    positions.push(SPAN_START + vg + i * (vbw + vg));
  }

  // Gap dim: post right face → first baluster left edge
  const GAP_X1 = SPAN_START;   // 102
  const GAP_X2 = positions[0]; // first baluster left edge
  const GAP_Y = 128;

  // Total span dim: inner faces of both posts, below ground
  const TOT_Y = 244;

  return wrap(
    <svg
      viewBox="0 0 380 320"
      width="100%"
      role="img"
      aria-label={`Baluster layout: ${balusterCount} balusters, ${Math.round(gap)}mm gap, ${totalLength}mm total span`}
      style={{ display: 'block' }}
    >
      <title>Baluster spacing layout</title>
      <desc>{`${balusterCount} balusters at ${Math.round(gap)}mm gap over ${totalLength}mm total span`}</desc>

      <defs>
        <clipPath id="balHatchClip">
          <rect x={GL} y={GROUND_Y} width={GR - GL} height={HATCH_DEPTH} />
        </clipPath>
        {/* Arrow markers — named to avoid collisions with other SVG diagrams on the page */}
        <marker id="bdS" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M8 1L2 5L8 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="bdE" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>

      {/* ── Structure ─────────────────────────────────────────────────────── */}

      {/* Balusters — drawn first so rails and posts sit on top */}
      {positions.map((x, i) => (
        <rect key={i}
          x={x} y={BAL_TOP} width={vbw} height={BAL_H}
          fill={STRUCT_FILL} stroke={BLACK} strokeWidth={1.5} rx={0.5}
        />
      ))}

      {/* Top rail */}
      <rect x={L_POST} y={TOP_RAIL_Y} width={RAIL_W} height={TOP_RAIL_H}
        fill={STRUCT_FILL} stroke={BLACK} strokeWidth={3} />

      {/* Bottom rail */}
      <rect x={L_POST} y={BOT_RAIL_Y} width={RAIL_W} height={BOT_RAIL_H}
        fill={STRUCT_FILL} stroke={BLACK} strokeWidth={3} />

      {/* Posts — drawn last so they paint over rail ends cleanly */}
      <rect x={L_POST} y={TOP_RAIL_Y} width={POST_W} height={GROUND_Y - TOP_RAIL_Y}
        fill={STRUCT_FILL} stroke={BLACK} strokeWidth={3} />
      <rect x={R_POST} y={TOP_RAIL_Y} width={POST_W} height={GROUND_Y - TOP_RAIL_Y}
        fill={STRUCT_FILL} stroke={BLACK} strokeWidth={3} />

      {/* Ground line */}
      <line x1={GL} y1={GROUND_Y} x2={GR} y2={GROUND_Y} stroke={BLACK} strokeWidth={3} />

      {/* Ground hatching */}
      <g clipPath="url(#balHatchClip)">
        {hatchLines(GL, GR, GROUND_Y, HATCH_DEPTH)}
      </g>

      {/* ── Dimension: Gap (left margin) ──────────────────────────────────── */}

      {/* Dashed leader from label edge to start of gap arrow */}
      <line x1={70} y1={GAP_Y} x2={GAP_X1} y2={GAP_Y}
        stroke={ORANGE} strokeWidth={0.5} strokeDasharray="3,3" />

      <HorizDim x1={GAP_X1} x2={GAP_X2} y={GAP_Y} markerId="bd" />

      {/* Gap label — left margin, vertically centred on the arrow */}
      <DimLabel caption="Gap" value={Math.round(gap)} cx={38} cy={110} />

      {/* ── Dimension: Total span (below) ─────────────────────────────────── */}

      {/* Vertical witness lines from ground down to arrow */}
      <line x1={SPAN_START} y1={GROUND_Y} x2={SPAN_START} y2={TOT_Y}
        stroke={ORANGE} strokeWidth={1} />
      <line x1={SPAN_END} y1={GROUND_Y} x2={SPAN_END} y2={TOT_Y}
        stroke={ORANGE} strokeWidth={1} />

      <HorizDim x1={SPAN_START} x2={SPAN_END} y={TOT_Y} markerId="bd" />

      {/* Total span label — centred below the arrow */}
      <DimLabel caption="Total span" value={totalLength} cx={190} cy={260} />
    </svg>
  );
});
