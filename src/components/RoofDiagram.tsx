import { memo, useRef } from 'react';

export interface RoofDiagramProps {
  buildingWidthMm: number;
  pitchDegrees: number;
  ridgeHeightMm: number;
  rafterLengthMm: number;  // totalRafterLength with overhang
  overhangMm: number;
}

const VB_W  = 900;
const VB_H  = 760;
const ORANGE = '#FF5A1F';
const INK    = '#0A0A0A';
const FILL   = '#ECECE8';
const BG     = '#F5F5F3';
const FONT   = 'Inter, system-ui, sans-serif';
const MONO   = "'JetBrains Mono','Courier New',monospace";

const PLATE_Y          = 490;
const FLOOR_Y          = 536;
const RIDGE_X          = 450;
const MAX_RIDGE_PX     = 350;
const NAT_HALF_SPAN_PX = 270;
const RAFTER_HD        = 10;   // half-depth of rafter in px
const RIDGE_W          = 18;   // ridge board width in px
const WALL_W           = 16;
const WALL_H           = 46;
const PLATE_H          = 16;

function fmt(n: number) { return String(Math.round(n)); }
function polyPts(pts: [number, number][]) {
  return pts.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');
}

export const RoofDiagram = memo(function RoofDiagram({
  buildingWidthMm,
  pitchDegrees,
  ridgeHeightMm,
  rafterLengthMm,
  overhangMm,
}: RoofDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const halfSpanMm = buildingWidthMm / 2;

  // Scale so ridge height fits within MAX_RIDGE_PX
  const naturalRidgePx = NAT_HALF_SPAN_PX * (ridgeHeightMm / halfSpanMm);
  const scale      = naturalRidgePx > MAX_RIDGE_PX ? MAX_RIDGE_PX / naturalRidgePx : 1;
  const halfSpanPx = NAT_HALF_SPAN_PX * scale;
  const ridgePx    = Math.min(naturalRidgePx, MAX_RIDGE_PX);
  const overhangPx = (overhangMm / halfSpanMm) * halfSpanPx;

  // Key x positions
  const wallLeft  = RIDGE_X - halfSpanPx;           // outer face of left wall
  const wallRight = RIDGE_X + halfSpanPx;           // inner face of right wall rect (outer = +WALL_W)
  const eaveLeft  = wallLeft  - overhangPx;
  const eaveRight = wallRight + WALL_W + overhangPx;
  const ridgeY    = PLATE_Y - ridgePx;

  // ── Left rafter geometry ──────────────────────────────────────────────────
  const ridgeFaceL = RIDGE_X - RIDGE_W / 2;  // left face of ridge board
  const ldx = RIDGE_X - eaveLeft;
  const ldy = ridgeY - PLATE_Y;

  const lLen = Math.sqrt(ldx * ldx + ldy * ldy);
  const lux = ldx / lLen, luy = ldy / lLen;
  // CW normal = (luy, -lux) → upper-left (toward roof surface)
  const lnx = luy, lny = -lux;

  const lA: [number, number] = [eaveLeft + lnx * RAFTER_HD, PLATE_Y + lny * RAFTER_HD];
  const lD: [number, number] = [eaveLeft - lnx * RAFTER_HD, PLATE_Y - lny * RAFTER_HD];
  // Ridge end: vertical cut — intersect upper/lower face lines with x = ridgeFaceL
  const tUpperL = (ridgeFaceL - lA[0]) / ldx;
  const lB: [number, number] = [ridgeFaceL, lA[1] + tUpperL * ldy];
  const tLowerL = (ridgeFaceL - lD[0]) / ldx;
  const lC: [number, number] = [ridgeFaceL, lD[1] + tLowerL * ldy];

  // ── Right rafter geometry ─────────────────────────────────────────────────
  const ridgeFaceR = RIDGE_X + RIDGE_W / 2;  // right face of ridge board
  const rdx = RIDGE_X - eaveRight;
  const rdy = ridgeY - PLATE_Y;

  const rLen = Math.sqrt(rdx * rdx + rdy * rdy);
  const rux = rdx / rLen, ruy = rdy / rLen;
  // CCW normal = (-ruy, rux) → upper-right (toward roof surface)
  const rnx = -ruy, rny = rux;

  const rA: [number, number] = [eaveRight + rnx * RAFTER_HD, PLATE_Y + rny * RAFTER_HD];
  const rD: [number, number] = [eaveRight - rnx * RAFTER_HD, PLATE_Y - rny * RAFTER_HD];
  // Ridge end: vertical cut — intersect upper/lower face lines with x = ridgeFaceR
  const tUpperR = (ridgeFaceR - rA[0]) / rdx;
  const rB: [number, number] = [ridgeFaceR, rA[1] + tUpperR * rdy];
  const tLowerR = (ridgeFaceR - rD[0]) / rdx;
  const rC: [number, number] = [ridgeFaceR, rD[1] + tLowerR * rdy];

  // Ridge board rect: flush between rafter faces
  const ridgeBoardY = lB[1];
  const ridgeBoardH = lC[1] - lB[1];

  // ── Seat cuts (birdsmouths) at wall plates ────────────────────────────────
  // Left: lower face intersects top-of-plate (y = PLATE_Y - PLATE_H) and outer wall (x = wallLeft)
  const tSeatL  = (PLATE_Y - PLATE_H - lD[1]) / ldy;
  const lBMi: [number, number] = [lD[0] + tSeatL * ldx, PLATE_Y - PLATE_H];  // seat inner corner
  const lBMo: [number, number] = [wallLeft, PLATE_Y - PLATE_H];               // seat outer corner
  const tPlumbL = (wallLeft - lD[0]) / ldx;
  const lBMp: [number, number] = [wallLeft, lD[1] + tPlumbL * ldy];           // plumb cut bottom

  // Right: same logic, outer face = wallRight + WALL_W
  const wallOuter = wallRight + WALL_W;
  const tSeatR  = (PLATE_Y - PLATE_H - rD[1]) / rdy;
  const rBMi: [number, number] = [rD[0] + tSeatR * rdx, PLATE_Y - PLATE_H];
  const rBMo: [number, number] = [wallOuter, PLATE_Y - PLATE_H];
  const tPlumbR = (wallOuter - rD[0]) / rdx;
  const rBMp: [number, number] = [wallOuter, rD[1] + tPlumbR * rdy];

  // ── Rafter annotation (stringer style, offset upper-left of left rafter) ──
  const annOff = 28;
  const annX1 = lA[0] + lnx * annOff;
  const annY1 = lA[1] + lny * annOff;
  const annX2 = lB[0] + lnx * annOff;
  const annY2 = lB[1] + lny * annOff;
  const tickX = lux * 10, tickY = luy * 10;
  const midAnnX = (annX1 + annX2) / 2 + lnx * 32;
  const midAnnY = (annY1 + annY2) / 2 + lny * 32;

  // ── Pitch reference triangle — floating reference at top-left ─
  const triBase = 80;
  const triRise = triBase * Math.tan(pitchDegrees * Math.PI / 180);
  const triBaseY = 72;

  // ── Floor hatch ───────────────────────────────────────────────────────────
  const hatchXs: number[] = [];
  for (let x = 75; x < eaveRight + 40; x += 34) hatchXs.push(x);

  // Width annotation outer faces: wallLeft (left outer) and wallRight+WALL_W (right outer)
  const widthLeft  = wallLeft;
  const widthRight = wallRight + WALL_W;

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
        const name = `roof-${Math.round(buildingWidthMm)}w-${pitchDegrees}deg.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Roof Pitch Diagram' }); return; } catch { /**/ }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>ROOF PITCH</p>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }} role="img">
        <title>Roof pitch diagram</title>

        {/* Left rafter — with birdsmouth notch over wall plate */}
        <polygon points={polyPts([lA, lB, lC, lBMi, lBMo, lBMp, lD])}
          fill={FILL} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />

        {/* Right rafter — with birdsmouth notch over wall plate */}
        <polygon points={polyPts([rA, rB, rC, rBMi, rBMo, rBMp, rD])}
          fill={FILL} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />

        {/* Ridge board — upright, flush between rafter faces */}
        <rect x={Math.round(ridgeFaceL)} y={Math.round(ridgeBoardY)}
          width={RIDGE_W} height={Math.round(ridgeBoardH)}
          fill={FILL} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />

        {/* Left wall plate */}
        <rect x={Math.round(wallLeft)} y={PLATE_Y - PLATE_H} width={WALL_W} height={PLATE_H}
          fill={FILL} stroke={INK} strokeWidth={2} strokeLinejoin="round" />

        {/* Right wall plate */}
        <rect x={Math.round(wallRight)} y={PLATE_Y - PLATE_H} width={WALL_W} height={PLATE_H}
          fill={FILL} stroke={INK} strokeWidth={2} strokeLinejoin="round" />

        {/* Left wall stub */}
        <rect x={Math.round(wallLeft)} y={PLATE_Y} width={WALL_W} height={WALL_H}
          fill={FILL} stroke={INK} strokeWidth={1.5} />

        {/* Right wall stub */}
        <rect x={Math.round(wallRight)} y={PLATE_Y} width={WALL_W} height={WALL_H}
          fill={FILL} stroke={INK} strokeWidth={1.5} />

        {/* Floor line + hatch */}
        <line x1={75} y1={FLOOR_Y} x2={Math.round(eaveRight) + 40} y2={FLOOR_Y}
          stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {hatchXs.map(x => (
          <line key={x} x1={x} y1={FLOOR_Y} x2={x + 13} y2={FLOOR_Y + 13}
            stroke={INK} strokeWidth={0.7} opacity={0.30} />
        ))}

        {/* ── ANNOTATION 1 — Pitch reference triangle ── */}
        <line x1={200} y1={triBaseY} x2={280} y2={triBaseY} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={200} y1={Math.round(triBaseY - triRise)} x2={200} y2={triBaseY} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <line x1={280} y1={triBaseY} x2={200} y2={Math.round(triBaseY - triRise)} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <path d={`M200,${triBaseY - 10} L210,${triBaseY - 10} L210,${triBaseY}`} fill="none" stroke={ORANGE} strokeWidth={1} opacity={0.55} />
        <text x={298} y={Math.round(triBaseY - triRise - 10)} textAnchor="start" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Pitch</text>
        <text x={298} y={Math.round(triBaseY - triRise + 14)} textAnchor="start" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{pitchDegrees}</text>
        <text x={298} y={Math.round(triBaseY - triRise + 32)} textAnchor="start" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>°</text>

        {/* ── ANNOTATION 2 — Ridge height (left) ── */}
        <line x1={Math.round(wallLeft)} y1={Math.round(ridgeY)} x2={55} y2={Math.round(ridgeY)} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={Math.round(wallLeft)} y1={PLATE_Y - PLATE_H}  x2={55} y2={PLATE_Y - PLATE_H}  stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={58} y1={Math.round(ridgeY) + 12} x2={58} y2={PLATE_Y - PLATE_H - 12} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`58,${Math.round(ridgeY)} 53,${Math.round(ridgeY) + 12} 63,${Math.round(ridgeY) + 12}`} fill={ORANGE} />
        <polygon points={`58,${PLATE_Y - PLATE_H} 53,${PLATE_Y - PLATE_H - 12} 63,${PLATE_Y - PLATE_H - 12}`} fill={ORANGE} />
        {(() => {
          const midY = (ridgeY + PLATE_Y - PLATE_H) / 2;
          return <>
            <text x={28} y={Math.round(midY - 14)} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Height</text>
            <text x={28} y={Math.round(midY + 10)} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(ridgeHeightMm)}</text>
            <text x={28} y={Math.round(midY + 28)} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>
          </>;
        })()}

        {/* ── ANNOTATION 3 — Building width (bottom, outer faces) ── */}
        <line x1={Math.round(widthLeft)}  y1={FLOOR_Y} x2={Math.round(widthLeft)}  y2={623} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={Math.round(widthRight)} y1={FLOOR_Y} x2={Math.round(widthRight)} y2={623} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={Math.round(widthLeft) + 12} y1={626} x2={Math.round(widthRight) - 12} y2={626} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${Math.round(widthLeft)},626 ${Math.round(widthLeft) + 12},621 ${Math.round(widthLeft) + 12},631`} fill={ORANGE} />
        <polygon points={`${Math.round(widthRight)},626 ${Math.round(widthRight) - 12},621 ${Math.round(widthRight) - 12},631`} fill={ORANGE} />
        <text x={RIDGE_X} y={649} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Width</text>
        <text x={RIDGE_X} y={673} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(buildingWidthMm)}</text>
        <text x={RIDGE_X} y={691} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── ANNOTATION 4 — Rafter length (stringer style, left rafter) ── */}
        {/* Extension lines from rafter face to annotation line */}
        <line x1={Math.round(lA[0])} y1={Math.round(lA[1])} x2={Math.round(annX1)} y2={Math.round(annY1)} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={Math.round(lB[0])} y1={Math.round(lB[1])} x2={Math.round(annX2)} y2={Math.round(annY2)} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        {/* Annotation line */}
        <line x1={Math.round(annX1)} y1={Math.round(annY1)} x2={Math.round(annX2)} y2={Math.round(annY2)} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* Tick at eave */}
        <line x1={Math.round(annX1 - tickX)} y1={Math.round(annY1 - tickY)} x2={Math.round(annX1 + tickX)} y2={Math.round(annY1 + tickY)} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* Tick at ridge */}
        <line x1={Math.round(annX2 - tickX)} y1={Math.round(annY2 - tickY)} x2={Math.round(annX2 + tickX)} y2={Math.round(annY2 + tickY)} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* Label */}
        <text x={Math.round(midAnnX)} y={Math.round(midAnnY - 14)} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Rafter</text>
        <text x={Math.round(midAnnX)} y={Math.round(midAnnY + 10)} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{fmt(rafterLengthMm)}</text>
        <text x={Math.round(midAnnX)} y={Math.round(midAnnY + 28)} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>
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
