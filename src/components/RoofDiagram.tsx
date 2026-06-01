import { memo, useRef } from 'react';

export interface RoofDiagramProps {
  buildingWidthMm: number;
  pitchDegrees: number;
  ridgeHeightMm: number;
  rafterLengthMm: number;  // totalRafterLength with overhang
  overhangMm: number;
  seatWidthMm?: number;       // plate width — shows seat dim when provided
  plumbDepthMm?: number;      // birdsmouth plumb depth — shows plumb dim when provided
  cutRafterLengthMm?: number; // rafter length ridge-to-seat (no overhang) — shows from-top measurement
  label?: string;
}

const ORANGE = '#FF5A1F';
const INK    = '#0A0A0A';
const WOOD   = '#ECECE8';
const TIMBER = '#C9A870';
const WALL   = '#C0C0BC';
const FONT   = 'Inter, system-ui, sans-serif';
const MONO   = "'JetBrains Mono','Courier New',monospace";

const VB_W = 760;
const VB_H = 420;
const FLOOR_Y = 380;

// Fixed birdsmouth / top plate anchor — these never move
const PLATE_OUTER_X = 264;   // left edge of plate rect
const PLATE_W       = 90;    // plate width in px
const HEEL_X        = PLATE_OUTER_X;             // outer face of top plate = heel cut x (= 264)
const PLATE_Y_TOP   = 236;   // top of plate = seat cut y
const SEAT_W        = PLATE_W;                   // seat spans the full plate width
const SEAT_INNER_X  = HEEL_X + SEAT_W;           // inner face of plate (= 354)
const PLATE_H       = 26;    // thinner plate — closer to real proportions
const WALL_H        = 70;    // slightly shorter wall
const RAFTER_PERP   = 46;    // perpendicular rafter depth in px
const ARC_R         = 44;    // pitch arc radius in px

function r(n: number) { return Math.round(n); }

export const RoofDiagram = memo(function RoofDiagram({
  pitchDegrees,
  rafterLengthMm,
  seatWidthMm,
  plumbDepthMm,
  cutRafterLengthMm,
  label,
}: RoofDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Clamp pitch to a drawable range
  const pitch  = Math.max(5, Math.min(pitchDegrees, 70));
  const pRad   = pitch * Math.PI / 180;
  const cosP   = Math.cos(pRad);
  const sinP   = Math.sin(pRad);
  const tanP   = sinP / cosP;

  // ── Birdsmouth geometry ────────────────────────────────────────────────────
  // Lower face is horizontal SEAT_W along the seat, then drops at pitch angle.
  // heelYBot = y where the lower rafter face re-emerges below the birdsmouth notch.
  const heelYBot = PLATE_Y_TOP + SEAT_W * tanP;

  // ── Ridge span (distance along rafter from seat inner to ridge cut) ────────
  // Constrain so the ridge top (upper face plumb cut) stays above MIN_Y.
  const MIN_Y      = 18;
  const RIDGE_FULL = 327;
  const ridgeAvailH = PLATE_Y_TOP - MIN_Y - RAFTER_PERP / cosP;
  const ridgeSpan   = Math.min(RIDGE_FULL, Math.max(ridgeAvailH / sinP, 80));

  // ── Tail span (distance along rafter from heel to tail cut) ───────────────
  const TAIL_FULL  = 200;
  const tailAvailH = FLOOR_Y - 30 - heelYBot;
  // tailAvailH can be negative for steep pitches (deep birdsmouth), so clamp to 0
  const tailSpan   = tailAvailH <= 0 ? 0 : Math.min(TAIL_FULL, tailAvailH / sinP);

  // ── Key rafter points (plumb cuts at both ends) ───────────────────────────
  // Plumb cut height = RAFTER_PERP / cosP  (vertical face dimension)
  const plumbH = RAFTER_PERP / cosP;

  const ridgeBotX = SEAT_INNER_X + ridgeSpan * cosP;
  const ridgeBotY = PLATE_Y_TOP  - ridgeSpan * sinP;
  const ridgeTopX = ridgeBotX;                     // plumb cut: same x
  const ridgeTopY = ridgeBotY - plumbH;

  const tailBotX  = HEEL_X   - tailSpan * cosP;
  const tailBotY  = heelYBot + tailSpan * sinP;
  const tailTopX  = tailBotX;                      // plumb cut: same x
  const tailTopY  = tailBotY - plumbH;

  // ── Rafter polygon (clockwise) ─────────────────────────────────────────────
  const pts = [
    [tailTopX,     tailTopY],
    [ridgeTopX,    ridgeTopY],
    [ridgeBotX,    ridgeBotY],
    [SEAT_INNER_X, PLATE_Y_TOP],
    [HEEL_X,       PLATE_Y_TOP],
    [HEEL_X,       heelYBot],
    [tailBotX,     tailBotY],
  ].map(([x, y]) => `${r(x)},${r(y)}`).join(' ');

  // ── Pitch arc at tail bottom ───────────────────────────────────────────────
  const arcStartX = tailBotX + ARC_R;              // horizontal reference
  const arcEndX   = tailBotX + ARC_R * cosP;
  const arcEndY   = tailBotY - ARC_R * sinP;

  // ── Rafter length annotation (offset above upper face, along rafter) ───────
  // Unit normal pointing toward the top of the rafter (visually up in SVG y-down):
  const nx = -sinP;
  const ny = -cosP;

  // How far to push the annotation line above the upper face — clamp so it
  // doesn't leave the viewbox at the ridge end.
  const annOff   = Math.min(38, Math.max((ridgeTopY - 5) / cosP, 8));

  const annSX = tailTopX  + annOff * nx;
  const annSY = tailTopY  + annOff * ny;
  const annEX = ridgeTopX + annOff * nx;
  const annEY = ridgeTopY + annOff * ny;

  // Tick direction: along the rafter face
  const TICK = 10;
  const tdx  = cosP, tdy = -sinP;

  // Rotated label — centred above the annotation midpoint
  const labelOff  = annOff + 24;
  const midX      = (tailBotX  + ridgeBotX) / 2;
  const midTopY   = (tailTopY  + ridgeTopY) / 2;
  const lblX      = r(midX   + labelOff * nx);
  const lblY      = r(midTopY + labelOff * ny);

  // ── Birdsmouth annotation positions ───────────────────────────────────────
  const seatDimY    = PLATE_Y_TOP + 9;
  const seatMidX    = r((HEEL_X + SEAT_INNER_X) / 2);
  const birdsDimX   = HEEL_X + 12;
  const heelYBotR   = r(heelYBot);
  const plumbRange  = heelYBotR - PLATE_Y_TOP;
  const plumbMidY   = r((PLATE_Y_TOP + heelYBotR) / 2);

  // ── Ridge-to-seat dimension (along bottom rafter face) ──────────────────
  // Label dropped below the midpoint of the bottom face, clear of anatomy labels
  const rsMidX = r((ridgeBotX + SEAT_INNER_X) / 2);
  const rsMidY = r((ridgeBotY + PLATE_Y_TOP)  / 2);
  const rsLblX = r(rsMidX + sinP * 30);
  const rsLblY = r(rsMidY + cosP * 30);

  // ── Anatomy label leader endpoints ─────────────────────────────────────────
  const tailMidY  = r((tailBotY  + tailTopY)  / 2);
  const heelMidY  = r((PLATE_Y_TOP + heelYBot) / 2);
  const ridgeMidY = r((ridgeBotY  + ridgeTopY) / 2);

  // Ridge label x — place to the right of ridge cut, clamped inside viewbox
  const ridgeLabelX = Math.min(r(ridgeBotX) + 8, VB_W - 95);

  // ── Wall hatch lines (clipped to wall rect) ────────────────────────────────
  const wallY0 = PLATE_Y_TOP + PLATE_H;
  const wallY1 = wallY0 + WALL_H;
  const hatchLines: number[] = [];
  for (let x = PLATE_OUTER_X - WALL_H; x < PLATE_OUTER_X + PLATE_W + 10; x += 12) {
    hatchLines.push(x);
  }

  // ── Floor hatch ────────────────────────────────────────────────────────────
  const floorHatch: number[] = [];
  for (let x = 40; x < VB_W - 20; x += 18) floorHatch.push(x);

  // ── Save diagram ───────────────────────────────────────────────────────────
  async function handleSave() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(VB_W));
    clone.setAttribute('height', String(VB_H));
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('width', '100%'); bg.setAttribute('height', '100%');
    bg.setAttribute('fill', '#F5F5F3');
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
        const name = `roof-${pitchDegrees}deg.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Roof Pitch Diagram' }); return; } catch { /**/ }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>RAFTER ANATOMY</p>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }} role="img">
        <title>Roof rafter anatomy diagram</title>
        <defs>
          <marker id="roofArr" viewBox="0 0 10 8" refX="9" refY="4"
            markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 4 L 0 8 Z" fill={ORANGE} />
          </marker>
          <clipPath id="roofWallClip">
            <rect x={PLATE_OUTER_X} y={wallY0} width={PLATE_W} height={WALL_H} />
          </clipPath>
        </defs>

        {/* ── Supporting wall ───────────────────────────────────────────── */}
        <rect x={PLATE_OUTER_X} y={wallY0} width={PLATE_W} height={WALL_H}
          fill={WALL} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        <g clipPath="url(#roofWallClip)" opacity={0.35}>
          {hatchLines.map(x => (
            <line key={x}
              x1={x} y1={wallY0 - 20}
              x2={x + WALL_H + 20} y2={wallY1 + 20}
              stroke={INK} strokeWidth={0.8} />
          ))}
        </g>

        {/* ── Top plate ─────────────────────────────────────────────────── */}
        <rect x={PLATE_OUTER_X} y={PLATE_Y_TOP} width={PLATE_W} height={PLATE_H}
          fill={TIMBER} stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        <line x1={PLATE_OUTER_X + 4} y1={PLATE_Y_TOP + PLATE_H / 2} x2={PLATE_OUTER_X + PLATE_W - 4} y2={PLATE_Y_TOP + PLATE_H / 2}
          stroke={INK} strokeWidth={0.5} opacity={0.2} />

        {/* ── Floor line + hatch ────────────────────────────────────────── */}
        <line x1={30} y1={FLOOR_Y} x2={VB_W - 20} y2={FLOOR_Y}
          stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {floorHatch.map(x => (
          <line key={x} x1={x} y1={FLOOR_Y} x2={x + 13} y2={FLOOR_Y + 13}
            stroke={INK} strokeWidth={0.7} opacity={0.28} />
        ))}

        {/* ── Rafter body (with birdsmouth notch) ──────────────────────── */}
        <polygon points={pts} fill={WOOD} stroke={INK} strokeWidth={2} strokeLinejoin="round" />

        {/* ── Pitch arc + dashed reference line + label ─────────────────── */}
        <line
          x1={r(tailBotX)} y1={r(tailBotY)}
          x2={r(tailBotX + ARC_R + 16)} y2={r(tailBotY)}
          stroke={ORANGE} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
        <path
          d={`M ${r(arcStartX)},${r(tailBotY)} A ${ARC_R},${ARC_R} 0 0,0 ${r(arcEndX)},${r(arcEndY)}`}
          fill="none" stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <text
          x={r(tailBotX + ARC_R + 10)}
          y={r(tailBotY - ARC_R * sinP * 0.5) - 2}
          fontFamily={FONT} fontSize={15} fontWeight={600} fill={ORANGE}>
          {pitchDegrees}°
        </text>

        {/* ── Ridge-to-seat dimension (along bottom rafter face) ──────────── */}
        {cutRafterLengthMm !== undefined && <>
          {/* Dim line along the bottom face from ridge to seat */}
          <line x1={r(ridgeBotX)} y1={r(ridgeBotY)} x2={SEAT_INNER_X} y2={PLATE_Y_TOP}
            stroke={ORANGE} strokeWidth={1.8} strokeLinecap="round" opacity={0.75} />
          {/* Ticks perpendicular to rafter face at each end */}
          <line
            x1={r(SEAT_INNER_X - 7*sinP)} y1={r(PLATE_Y_TOP - 7*cosP)}
            x2={r(SEAT_INNER_X + 7*sinP)} y2={r(PLATE_Y_TOP + 7*cosP)}
            stroke={ORANGE} strokeWidth={1.8} strokeLinecap="round" />
          <line
            x1={r(ridgeBotX - 7*sinP)} y1={r(ridgeBotY - 7*cosP)}
            x2={r(ridgeBotX + 7*sinP)} y2={r(ridgeBotY + 7*cosP)}
            stroke={ORANGE} strokeWidth={1.8} strokeLinecap="round" />
          {/* Rotated label dropped below face midpoint */}
          <g transform={`rotate(${-pitch}, ${rsLblX}, ${rsLblY})`}>
            <text x={rsLblX} y={rsLblY - 5} textAnchor="middle"
              fontFamily={FONT} fontSize={11} fontWeight={500} fill={ORANGE}>
              Ridge to seat
            </text>
            <text x={rsLblX} y={rsLblY + 10} textAnchor="middle"
              fontFamily={MONO} fontSize={14} fontWeight={600} fill={ORANGE}>
              {Math.round(cutRafterLengthMm)}mm
            </text>
          </g>
        </>}

        {/* ── Birdsmouth seat width ──────────────────────────────────────── */}
        {seatWidthMm !== undefined && seatWidthMm > 0 && <>
          <line x1={HEEL_X + 3} y1={seatDimY} x2={SEAT_INNER_X - 3} y2={seatDimY}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={HEEL_X}       y1={seatDimY - 5} x2={HEEL_X}       y2={seatDimY + 5}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={SEAT_INNER_X} y1={seatDimY - 5} x2={SEAT_INNER_X} y2={seatDimY + 5}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <text x={seatMidX} y={PLATE_Y_TOP - 2}
            textAnchor="middle" fontFamily={MONO} fontSize={13} fontWeight={600} fill={ORANGE}>
            {Math.round(seatWidthMm)}mm
          </text>
        </>}

        {/* ── Birdsmouth plumb depth ─────────────────────────────────────── */}
        {plumbDepthMm !== undefined && plumbDepthMm > 0 && plumbRange >= 14 && <>
          <line x1={birdsDimX} y1={PLATE_Y_TOP + 3} x2={birdsDimX} y2={heelYBotR - 3}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={birdsDimX - 6} y1={PLATE_Y_TOP} x2={birdsDimX + 6} y2={PLATE_Y_TOP}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={birdsDimX - 6} y1={heelYBotR}   x2={birdsDimX + 6} y2={heelYBotR}
            stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
          <text x={birdsDimX + 14} y={plumbMidY + 4}
            textAnchor="start" fontFamily={MONO} fontSize={13} fontWeight={600} fill={ORANGE}>
            {Math.round(plumbDepthMm)}mm
          </text>
        </>}

        {/* ── Rafter length annotation line + label ─────────────────────── */}
        {/* Extension lines from upper face to annotation line */}
        <line x1={r(tailTopX)} y1={r(tailTopY)} x2={r(annSX)} y2={r(annSY)}
          stroke={ORANGE} strokeWidth={0.8} opacity={0.4} />
        <line x1={r(ridgeTopX)} y1={r(ridgeTopY)} x2={r(annEX)} y2={r(annEY)}
          stroke={ORANGE} strokeWidth={0.8} opacity={0.4} />
        {/* Annotation shaft */}
        <line x1={r(annSX)} y1={r(annSY)} x2={r(annEX)} y2={r(annEY)}
          stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* End ticks (perpendicular to rafter) */}
        <line
          x1={r(annSX - TICK * tdx)} y1={r(annSY + TICK * tdy)}
          x2={r(annSX + TICK * tdx)} y2={r(annSY - TICK * tdy)}
          stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <line
          x1={r(annEX - TICK * tdx)} y1={r(annEY + TICK * tdy)}
          x2={r(annEX + TICK * tdx)} y2={r(annEY - TICK * tdy)}
          stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        {/* Rotated label near midpoint */}
        <g transform={`rotate(${-pitch}, ${lblX}, ${lblY})`}>
          <text x={lblX} y={lblY - 14} textAnchor="middle"
            fontFamily={FONT} fontSize={16} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">
            Rafter
          </text>
          <text x={lblX} y={lblY + 8} textAnchor="middle"
            fontFamily={FONT} fontSize={20} fontWeight={600} fill={ORANGE}>
            {Math.round(rafterLengthMm)}
          </text>
          <text x={lblX} y={lblY + 22} textAnchor="middle"
            fontFamily={MONO} fontSize={12} fill={ORANGE} opacity={0.72}>
            mm
          </text>
        </g>

        {/* ── Anatomy labels ─────────────────────────────────────────────── */}

        {/* Tail Cut — left side, horizontal leader to tail cut face (hidden for very steep pitches) */}
        {tailSpan >= 40 && (
          <>
            <text x={12} y={tailMidY - 7}
              fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Tail</text>
            <text x={12} y={tailMidY + 9}
              fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Cut</text>
            <line x1={54} y1={tailMidY} x2={r(tailBotX) - 2} y2={tailMidY}
              stroke={ORANGE} strokeWidth={1} markerEnd="url(#roofArr)" />
          </>
        )}

        {/* Heel Cut — left of heel face, horizontal leader */}
        <text x={50} y={heelMidY - 7}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Heel</text>
        <text x={50} y={heelMidY + 9}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Cut</text>
        <line x1={98} y1={heelMidY} x2={HEEL_X - 2} y2={heelMidY}
          stroke={ORANGE} strokeWidth={1} markerEnd="url(#roofArr)" />

        {/* Ridge Cut — right of ridge, leader to midpoint of cut face */}
        <text x={ridgeLabelX} y={r(ridgeTopY) + 5}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Ridge</text>
        <text x={ridgeLabelX} y={r(ridgeTopY) + 21}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Cut</text>
        <line
          x1={ridgeLabelX - 3} y1={ridgeMidY}
          x2={r(ridgeBotX) + 2} y2={ridgeMidY}
          stroke={ORANGE} strokeWidth={1} markerEnd="url(#roofArr)" />

        {/* Top Plate — right of plate, single-line label with short leader */}
        <text x={SEAT_INNER_X + 14} y={PLATE_Y_TOP + PLATE_H / 2 + 5}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Top Plate</text>
        <line x1={SEAT_INNER_X + 11} y1={PLATE_Y_TOP + PLATE_H / 2}
              x2={SEAT_INNER_X + 2}  y2={PLATE_Y_TOP + PLATE_H / 2}
          stroke={ORANGE} strokeWidth={1} markerEnd="url(#roofArr)" />

        {/* Supporting Wall — right of wall, leader pointing left into wall */}
        <text x={366} y={wallY0 + 28}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Supporting</text>
        <text x={366} y={wallY0 + 44}
          fontFamily={FONT} fontSize={13} fontWeight={500} fill={ORANGE}>Wall</text>
        <line x1={363} y1={wallY0 + 34} x2={356} y2={wallY0 + 34}
          stroke={ORANGE} strokeWidth={1} markerEnd="url(#roofArr)" />

        {label && <text x={748} y={20} textAnchor="end" fontFamily={FONT} fontSize="15" fontWeight="600" fill={INK} opacity={0.5}>{label}</text>}
      </svg>

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
    </div>
  );
});
