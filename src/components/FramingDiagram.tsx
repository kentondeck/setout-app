import { memo, useRef } from 'react';

export interface FramingDiagramProps {
  wallLengthMm: number;
  wallHeightMm: number;
  studCount: number;
  studSpacingMm: number;
  nogginRows: number;
  doubleTopPlate: boolean;
  doubleStuds: boolean;
  label?: string;
}

const VB_W   = 900;
const VB_H   = 760;
const ORANGE = '#FF5A1F';
const INK    = '#0A0A0A';
const FILL   = '#ECECE8';
const BG     = '#F5F5F3';
const FONT   = 'Inter, system-ui, sans-serif';
const MONO   = "'JetBrains Mono','Courier New',monospace";

const WALL_LEFT  = 100;
const WALL_TOP   = 110;
const FLOOR_Y    = 570;
const PLATE_H    = 16;
const STUD_W_BASE = 16;

export const FramingDiagram = memo(function FramingDiagram({
  wallLengthMm,
  wallHeightMm,
  studCount,
  studSpacingMm,
  nogginRows,
  doubleTopPlate,
  doubleStuds,
  label,
}: FramingDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const studW        = doubleStuds ? STUD_W_BASE * 2 : STUD_W_BASE;
  const topPlateCount = doubleTopPlate ? 2 : 1;
  const studTop      = WALL_TOP + topPlateCount * PLATE_H;
  const studBottom   = FLOOR_Y - PLATE_H;
  const studHeight   = studBottom - studTop;
  const wallWidth    = 676;
  const wallRight    = WALL_LEFT + wallWidth;

  // Evenly distribute studs so first stud left edge = WALL_LEFT, last stud right edge = wallRight
  const studSpacingPx = studCount > 1 ? (wallWidth - studW) / (studCount - 1) : 0;
  const studs = Array.from({ length: studCount }, (_, i) => WALL_LEFT + i * studSpacingPx);

  const bayInnerWidth = studSpacingPx - studW;

  // Noggin row y-positions (centred within each gap between rows)
  const nogginYs = Array.from({ length: nogginRows }, (_, i) =>
    Math.round(studTop + (studHeight / (nogginRows + 1)) * (i + 1) - PLATE_H / 2),
  );

  // Stud height annotation value (subtract all plates at 45mm each)
  const studHeightMm  = Math.max(0, Math.round(wallHeightMm - (topPlateCount + 1) * 45));
  const studHeightMidY = (studTop + studBottom) / 2;

  // Stud spacing annotation: middle stud pair
  const spacingIdx  = studCount > 1 ? Math.min(Math.floor((studCount - 1) / 2), studCount - 2) : 0;
  const spacingX1   = studs[spacingIdx] + studW / 2;
  const spacingX2   = studCount > 1 ? studs[spacingIdx + 1] + studW / 2 : spacingX1 + studSpacingPx;
  const spacingMidX = (spacingX1 + spacingX2) / 2;

  // Floor hatch
  const hatchXs: number[] = [];
  for (let x = 75; x < wallRight + 30; x += 34) hatchXs.push(x);

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
        const name = `framing-${Math.round(wallLengthMm)}x${Math.round(wallHeightMm)}.png`;
        const file = new File([blob], name, { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Wall Framing Diagram' }); return; } catch { /**/ }
        }
        // Fallback for WKWebView / iOS Safari where <a download> is ignored:
        // open the image so the user can long-press → Save Image to Photos.
        const blobUrl = URL.createObjectURL(blob);
        const opened = window.open(blobUrl, '_blank');
        if (!opened) window.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      }, 'image/png');
    };
    img.src = url;
  }

  return (
    <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', padding: '16px' }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--color-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>WALL FRAMING</p>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ display: 'block' }} role="img">
        <title>Wall framing diagram</title>

        {/* Top plate(s) */}
        {Array.from({ length: topPlateCount }, (_, i) => (
          <rect key={i}
            x={WALL_LEFT} y={WALL_TOP + i * PLATE_H}
            width={wallWidth} height={PLATE_H}
            fill={FILL} stroke={INK} strokeWidth={2} strokeLinejoin="round"
          />
        ))}

        {/* Bottom plate */}
        <rect
          x={WALL_LEFT} y={studBottom}
          width={wallWidth} height={PLATE_H}
          fill={FILL} stroke={INK} strokeWidth={2} strokeLinejoin="round"
        />

        {/* Studs */}
        {studs.map((x, i) => (
          <rect key={i}
            x={x} y={studTop}
            width={studW} height={studHeight}
            fill={FILL} stroke={INK} strokeWidth={1.5}
          />
        ))}

        {/* Noggins */}
        {nogginRows > 0 && nogginYs.map((nogY, ri) =>
          studs.slice(0, -1).map((x, si) => (
            <rect key={`${ri}-${si}`}
              x={x + studW} y={nogY}
              width={bayInnerWidth} height={PLATE_H}
              fill={FILL} stroke={INK} strokeWidth={1.5}
            />
          ))
        )}

        {/* Floor line + hatch */}
        <line x1={75} y1={FLOOR_Y} x2={wallRight + 24} y2={FLOOR_Y}
          stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
        {hatchXs.map(x => (
          <line key={x}
            x1={x} y1={FLOOR_Y} x2={x + 13} y2={FLOOR_Y + 13}
            stroke={INK} strokeWidth={0.7} opacity={0.30}
          />
        ))}

        {/* ── ANNOTATION 1 — Wall Height (left) ── */}
        <line x1={WALL_LEFT} y1={WALL_TOP} x2={55} y2={WALL_TOP} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={WALL_LEFT} y1={FLOOR_Y}  x2={55} y2={FLOOR_Y}  stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={58} y1={WALL_TOP + 12} x2={58} y2={FLOOR_Y - 12} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`58,${WALL_TOP} 53,${WALL_TOP + 12} 63,${WALL_TOP + 12}`} fill={ORANGE} />
        <polygon points={`58,${FLOOR_Y} 53,${FLOOR_Y - 12} 63,${FLOOR_Y - 12}`}   fill={ORANGE} />
        <text x={28} y={325} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Height</text>
        <text x={28} y={349} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{Math.round(wallHeightMm)}</text>
        <text x={28} y={367} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── ANNOTATION 2 — Wall Length (bottom) ── */}
        <line x1={WALL_LEFT} y1={FLOOR_Y} x2={WALL_LEFT} y2={635} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={wallRight} y1={FLOOR_Y} x2={wallRight} y2={635} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={WALL_LEFT + 12} y1={638} x2={wallRight - 12} y2={638} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`${WALL_LEFT},638 ${WALL_LEFT + 12},633 ${WALL_LEFT + 12},643`} fill={ORANGE} />
        <polygon points={`${wallRight},638 ${wallRight - 12},633 ${wallRight - 12},643`}   fill={ORANGE} />
        <text x={(WALL_LEFT + wallRight) / 2} y={661} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Length</text>
        <text x={(WALL_LEFT + wallRight) / 2} y={685} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{Math.round(wallLengthMm)}</text>
        <text x={(WALL_LEFT + wallRight) / 2} y={703} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {/* ── ANNOTATION 3 — Stud spacing (above) ── */}
        {studCount >= 2 && (
          <>
            <line x1={spacingX1} y1={WALL_TOP} x2={spacingX1} y2={85} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
            <line x1={spacingX2} y1={WALL_TOP} x2={spacingX2} y2={85} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
            <line x1={spacingX1 + 12} y1={82} x2={spacingX2 - 12} y2={82} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
            <polygon points={`${spacingX1},82 ${spacingX1 + 12},77 ${spacingX1 + 12},87`} fill={ORANGE} />
            <polygon points={`${spacingX2},82 ${spacingX2 - 12},77 ${spacingX2 - 12},87`} fill={ORANGE} />
            <text x={spacingMidX} y={72}  textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm c/c</text>
            <text x={spacingMidX} y={52}  textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{Math.round(studSpacingMm)}</text>
            <text x={spacingMidX} y={28}  textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Stud spacing</text>
          </>
        )}

        {/* ── ANNOTATION 4 — Stud height (right) ── */}
        <line x1={wallRight} y1={studTop}    x2={817} y2={studTop}    stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={wallRight} y1={studBottom} x2={817} y2={studBottom} stroke={ORANGE} strokeWidth={1} opacity={0.38} />
        <line x1={820} y1={studTop + 12} x2={820} y2={studBottom - 12} stroke={ORANGE} strokeWidth={1.5} strokeLinecap="round" />
        <polygon points={`820,${studTop}    815,${studTop + 12}    825,${studTop + 12}`}    fill={ORANGE} />
        <polygon points={`820,${studBottom} 815,${studBottom - 12} 825,${studBottom - 12}`} fill={ORANGE} />
        <text x={854} y={studHeightMidY - 25} textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">Stud</text>
        <text x={854} y={studHeightMidY - 6}  textAnchor="middle" fontFamily={FONT} fontSize={18} fontWeight={500} fill={ORANGE} letterSpacing="-0.3">height</text>
        <text x={854} y={studHeightMidY + 18} textAnchor="middle" fontFamily={FONT} fontSize={22} fontWeight={600} fill={ORANGE}>{studHeightMm}</text>
        <text x={854} y={studHeightMidY + 36} textAnchor="middle" fontFamily={MONO} fontSize={14} fill={ORANGE} opacity={0.72}>mm</text>

        {label && <text x={888} y={24} textAnchor="end" fontFamily={FONT} fontSize="15" fontWeight="600" fill={INK} opacity={0.5}>{label}</text>}
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
