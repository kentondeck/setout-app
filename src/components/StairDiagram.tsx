import { memo, useRef } from 'react';

export interface StairDiagramProps {
  riserCount: number;
  riserHeight: number;
  treadCount: number;
  treadDepth: number;
  stringerLength: number;
  totalRise: number;
  totalRun: number;
}

// Layout — stringer label sits in the upper-left open space above the stair
// profile, matching the reference design proportions exactly.
const VB_W    = 900;
const VB_H    = 790;
const FOOT_X  = 245;
const FLOOR_Y = 575;
const MAX_W   = 420;
const MAX_H   = 355;

const ORANGE = '#FF5A1F';
const INK    = '#0A0A0A';
const FILL   = '#ECECE8';
const BG     = '#F5F5F3';
const FONT   = 'Inter, system-ui, sans-serif';
const MONO   = "'JetBrains Mono','Courier New',monospace";

function fmt(n: number) { return String(Math.round(n)); }

export const StairDiagram = memo(function StairDiagram({
  riserCount,
  riserHeight,
  treadDepth,
  stringerLength,
  totalRise,
  totalRun,
}: StairDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const scale   = Math.min(MAX_W / totalRun, MAX_H / totalRise);
  const risePx  = riserHeight * scale;
  const goingPx = treadDepth  * scale;
  const drawnW  = totalRun    * scale;
  const drawnH  = totalRise   * scale;
  const topX    = FOOT_X + drawnW;
  const topY    = FLOOR_Y - drawnH;

  // Stair stepped profile path
  let profileD = `M${FOOT_X} ${FLOOR_Y}`;
  for (let i = 0; i < riserCount; i++) {
    profileD += ` V${(FLOOR_Y - (i + 1) * risePx).toFixed(1)} H${(FOOT_X + (i + 1) * goingPx).toFixed(1)}`;
  }
  const bodyD = profileD + ` V${FLOOR_Y} Z`;

  // Stringer
  const stringerPx = Math.sqrt(drawnW ** 2 + drawnH ** 2);
  const angle      = Math.atan2(drawnH, drawnW) * (180 / Math.PI);

  // ── 1. RISE — left of first riser ─────────────────────────────────────────
  const RISE_X   = FOOT_X - 46;
  const riseMidY = FLOOR_Y - risePx / 2;

  // ── 2. GOING — second-from-top tread (matches reference design) ───────────
  const goingTread  = Math.max(0, riserCount - 2);
  const goingX1     = FOOT_X + goingTread * goingPx;
  const goingX2     = goingX1 + goingPx;
  const goingMidX   = (goingX1 + goingX2) / 2;
  const goingTreadY = FLOOR_Y - (goingTread + 1) * risePx;
  const goingArrY   = goingTreadY - 20;
  const ahW         = Math.min(11, goingPx * 0.28);

  // ── 3. HEIGHT — right side ─────────────────────────────────────────────────
  const HEIGHT_X   = topX + 56;
  const heightMidY = FLOOR_Y - drawnH / 2;

  // ── 4. BASE — below floor ──────────────────────────────────────────────────
  const BASE_Y   = FLOOR_Y + 62;
  const baseMidX = FOOT_X + drawnW / 2;

  // ── 5. STRINGER — parallel dimension line in upper-left open space ────────
  // Unit vector along stringer (foot → top, in SVG coords where y increases down)
  const sUx = drawnW / stringerPx;
  const sUy = -drawnH / stringerPx;
  // Perpendicular pointing upper-left (away from stair body, into open space)
  const sPx = sUy;
  const sPy = -sUx;
  const STRINGER_DIM_OFFSET = 42;
  // Dimension line endpoints (parallel to stringer, offset perpendicular)
  const stDimAx = FOOT_X + sPx * STRINGER_DIM_OFFSET;
  const stDimAy = FLOOR_Y + sPy * STRINGER_DIM_OFFSET;
  const stDimBx = topX + sPx * STRINGER_DIM_OFFSET;
  const stDimBy = topY + sPy * STRINGER_DIM_OFFSET;
  const stDimMidX = (stDimAx + stDimBx) / 2;
  const stDimMidY = (stDimAy + stDimBy) / 2;
  // Label sits a bit further out from the dimension line
  const stLabelOffset = 26;
  const stLabelCx = stDimMidX + sPx * stLabelOffset;
  const stLabelCy = stDimMidY + sPy * stLabelOffset;

  // Hatches
  const floorHatches: number[] = [];
  for (let x = 36; x < topX + 56; x += 34) floorHatches.push(x);
  const landingHatches: number[] = [];
  for (let x = topX + 16; x < topX + 142; x += 34) landingHatches.push(x);

  // Save / share as PNG
  async function handleSave() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(VB_W));
    clone.setAttribute('height', String(VB_H));
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%'); bg.setAttribute('fill', BG);
    clone.insertBefore(bg, clone.firstChild);
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = VB_W * 2; canvas.height = VB_H * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(async blob => {
        if (!blob) return;
        const name = `stair-${Math.round(totalRise)}rise-${Math.round(totalRun)}run.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Stair Diagram' }); return; } catch { /**/ }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>STAIR DIAGRAM</p>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }}>

        {/* Body fill */}
        <path d={bodyD} fill={FILL} />

        {/* Floor */}
        <line x1={26} y1={FLOOR_Y} x2={topX + 56} y2={FLOOR_Y} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {floorHatches.map(x => (
          <line key={x} x1={x} y1={FLOOR_Y} x2={x + 12} y2={FLOOR_Y + 12} stroke={INK} strokeWidth={0.7} opacity={0.32} />
        ))}

        {/* Landing */}
        <line x1={topX} y1={topY}      x2={topX + 138} y2={topY}      stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={topX} y1={topY}      x2={topX}       y2={topY + 16} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={topX} y1={topY + 16} x2={topX + 138} y2={topY + 16} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {landingHatches.map(x => (
          <line key={x} x1={x} y1={topY - 14} x2={x + 14} y2={topY} stroke={INK} strokeWidth={0.7} opacity={0.32} />
        ))}

        {/* Stair profile */}
        <path d={profileD} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Stringer — dotted diagonal from kick plate on the floor (bottom-left)
            up to the ledger (top-right), which sits in the upper landing fascia
            below the topmost tread surface. Mirrors the reference STRINGER line. */}
        <line
          x1={FOOT_X} y1={FLOOR_Y}
          x2={topX}   y2={topY + 16}
          stroke={ORANGE} strokeWidth={1.5} strokeDasharray="3 4" strokeLinecap="round" opacity={0.7}
        />

        {/* ── STRINGER — parallel dimension in upper-left open space ── */}
        {/* Extension lines from stringer endpoints out to dimension line */}
        <line x1={FOOT_X} y1={FLOOR_Y} x2={stDimAx} y2={stDimAy} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={topX}   y1={topY}    x2={stDimBx} y2={stDimBy} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        {/* Parallel dimension line */}
        <line x1={stDimAx} y1={stDimAy} x2={stDimBx} y2={stDimBy} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* End ticks perpendicular to dimension line */}
        <line x1={stDimAx - sPx * 7} y1={stDimAy - sPy * 7} x2={stDimAx + sPx * 7} y2={stDimAy + sPy * 7} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={stDimBx - sPx * 7} y1={stDimBy - sPy * 7} x2={stDimBx + sPx * 7} y2={stDimBy + sPy * 7} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* Label centred above dimension line, rotated parallel to slope */}
        <g transform={`translate(${stLabelCx},${stLabelCy}) rotate(${-angle})`}>
          <text x={0} y={-4} textAnchor="middle" fontFamily={FONT} fontSize={16} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Stringer length</text>
          <text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontSize={20} fontWeight={600} fill={ORANGE}>
            {fmt(stringerLength)}<tspan dx={4} fontSize={12} fontFamily={MONO} opacity={0.72}>mm</tspan>
          </text>
        </g>

        {/* ── RISE — left ── */}
        <line x1={FOOT_X} y1={FLOOR_Y - risePx} x2={RISE_X + 8} y2={FLOOR_Y - risePx} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={FOOT_X} y1={FLOOR_Y}          x2={RISE_X + 8} y2={FLOOR_Y}          stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={RISE_X} y1={FLOOR_Y - risePx + 10} x2={RISE_X} y2={FLOOR_Y - 10} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${RISE_X},${FLOOR_Y - risePx} ${RISE_X-5},${FLOOR_Y-risePx+12} ${RISE_X+5},${FLOOR_Y-risePx+12}`} fill={ORANGE} />
        <polygon points={`${RISE_X},${FLOOR_Y}          ${RISE_X-5},${FLOOR_Y-12}          ${RISE_X+5},${FLOOR_Y-12}`}         fill={ORANGE} />
        <text x={RISE_X - 10} y={riseMidY - 14} textAnchor="end" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Rise</text>
        <text x={RISE_X - 10} y={riseMidY + 12} textAnchor="end" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(riserHeight)}</text>
        <text x={RISE_X - 10} y={riseMidY + 30} textAnchor="end" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── GOING — second-from-top tread ── */}
        <line x1={goingX1} y1={goingTreadY} x2={goingX1} y2={goingArrY - 6} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={goingX2} y1={goingTreadY} x2={goingX2} y2={goingArrY - 6} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={goingX1 + ahW} y1={goingArrY} x2={goingX2 - ahW} y2={goingArrY} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${goingX1},${goingArrY} ${goingX1+ahW},${goingArrY-5} ${goingX1+ahW},${goingArrY+5}`} fill={ORANGE} />
        <polygon points={`${goingX2},${goingArrY} ${goingX2-ahW},${goingArrY-5} ${goingX2-ahW},${goingArrY+5}`} fill={ORANGE} />
        <text x={goingMidX} y={goingArrY - 54} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Going</text>
        <text x={goingMidX} y={goingArrY - 28} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(treadDepth)}</text>
        <text x={goingMidX} y={goingArrY - 10} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── HEIGHT — right ── */}
        <line x1={topX}      y1={topY}    x2={HEIGHT_X - 8} y2={topY}    stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={topX + 56} y1={FLOOR_Y} x2={HEIGHT_X - 8} y2={FLOOR_Y} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={HEIGHT_X} y1={topY + 10} x2={HEIGHT_X} y2={FLOOR_Y - 10} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${HEIGHT_X},${topY}    ${HEIGHT_X-5},${topY+12}    ${HEIGHT_X+5},${topY+12}`}    fill={ORANGE} />
        <polygon points={`${HEIGHT_X},${FLOOR_Y} ${HEIGHT_X-5},${FLOOR_Y-12} ${HEIGHT_X+5},${FLOOR_Y-12}`} fill={ORANGE} />
        <text x={HEIGHT_X + 14} y={heightMidY - 14} textAnchor="start" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Height</text>
        <text x={HEIGHT_X + 14} y={heightMidY + 12} textAnchor="start" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(totalRise)}</text>
        <text x={HEIGHT_X + 14} y={heightMidY + 30} textAnchor="start" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── BASE LENGTH — below ── */}
        <line x1={FOOT_X} y1={FLOOR_Y} x2={FOOT_X} y2={BASE_Y - 8} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={topX}   y1={FLOOR_Y} x2={topX}   y2={BASE_Y - 8} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={FOOT_X + 10} y1={BASE_Y} x2={topX - 10} y2={BASE_Y} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${FOOT_X},${BASE_Y} ${FOOT_X+14},${BASE_Y-5} ${FOOT_X+14},${BASE_Y+5}`} fill={ORANGE} />
        <polygon points={`${topX},${BASE_Y}   ${topX-14},${BASE_Y-5}   ${topX-14},${BASE_Y+5}`}   fill={ORANGE} />
        <text x={baseMidX} y={BASE_Y + 26} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Base length</text>
        <text x={baseMidX} y={BASE_Y + 52} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(totalRun)}</text>
        <text x={baseMidX} y={BASE_Y + 70} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

      </svg>

      <button
        onClick={handleSave}
        style={{ marginTop: 14, width: '100%', padding: '13px', border: '0.5px solid var(--color-border)', borderRadius: 12, background: 'var(--color-bg)', color: 'var(--color-orange)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.2px' }}
        onPointerDown={e => (e.currentTarget.style.opacity = '0.7')}
        onPointerUp={e => (e.currentTarget.style.opacity = '1')}
        onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Save diagram
      </button>
    </div>
  );
});
