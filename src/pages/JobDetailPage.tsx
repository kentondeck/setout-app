import { useState, useContext, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { JobsContext, KeyboardContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import { buildJobOrder, applyBuffer, formatOrderText } from '../lib/jobOrder';
import type { OrderLine, JobOrder } from '../lib/jobOrder';
import type { HistoryEntry, CalculatorId, SavedJob } from '../types';
import { DeckingDiagram } from '../components/DeckingDiagram';
import { FramingDiagram } from '../components/FramingDiagram';
import { StairDiagram } from '../components/StairDiagram';
import { RoofDiagram } from '../components/RoofDiagram';
import { BalusterDiagram } from '../components/BalusterDiagram';
import { uuid } from '../lib/uuid';

// ─── helpers ─────────────────────────────────────────────────────────────────

function cleanKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
}

function timeStr(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function dayGroup(ts: number): 'today' | 'yesterday' | 'older' {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'today';
  if (d.toDateString() === yesterday.toDateString()) return 'yesterday';
  return 'older';
}

// ─── Calc icons ───────────────────────────────────────────────────────────────

function CalcIcon({ id, size = 24 }: { id: CalculatorId; size?: number }) {
  const o = 'var(--color-orange)';
  const icons: Partial<Record<CalculatorId, React.ReactNode>> = {
    framing: (
      <g fill={o}>
        <rect x="14" y="18" width="72" height="9" rx="2"/>
        <rect x="14" y="73" width="72" height="9" rx="2"/>
        <rect x="22" y="27" width="8" height="46" rx="1.5"/>
        <rect x="38" y="27" width="8" height="46" rx="1.5"/>
        <rect x="54" y="27" width="8" height="46" rx="1.5"/>
        <rect x="70" y="27" width="8" height="46" rx="1.5"/>
      </g>
    ),
    decking: (
      <g fill={o}>
        <path d="M10 80 L90 80 L86 71 L14 71 Z"/>
        <path d="M14.5 69 L85.5 69 L82 60.5 L18 60.5 Z"/>
        <path d="M18.5 58.5 L81.5 58.5 L78.5 51 L21.5 51 Z"/>
        <path d="M22 49 L78 49 L75.5 42.5 L24.5 42.5 Z"/>
        <path d="M25 40.5 L75 40.5 L73 35 L27 35 Z"/>
      </g>
    ),
    cutlist: (
      <g>
        <rect x="14" y="40" width="72" height="20" rx="3" stroke={o} strokeWidth="5" fill="none"/>
        <line x1="36" y1="40" x2="36" y2="60" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="58" y1="40" x2="58" y2="60" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="72" y1="40" x2="72" y2="60" stroke={o} strokeWidth="5" strokeLinecap="round"/>
      </g>
    ),
    concrete: (
      <g>
        <path d="M22 38 L78 38 L86 30 L30 30 Z M22 38 L22 70 L78 70 L78 38 M78 38 L86 30 L86 62 L78 70"
          stroke={o} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
        <circle cx="36" cy="50" r="2.5" fill={o}/>
        <circle cx="50" cy="58" r="2.5" fill={o}/>
        <circle cx="62" cy="48" r="2.5" fill={o}/>
        <circle cx="44" cy="64" r="2" fill={o}/>
      </g>
    ),
    stairs: (
      <g>
        <path d="M8 88 L92 28" stroke={o} strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M14 82 H34 V66 H54 V50 H74 V34 H86" stroke={o} strokeWidth="5"
          strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    ),
    roof: (
      <g>
        <path d="M10 62 L50 26 L90 62" stroke={o} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <path d="M10 62 H22 M78 62 H90 M22 62 V82 M78 62 V82" stroke={o} strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="M44 32 L56 32" stroke={o} strokeWidth="6" strokeLinecap="round"/>
      </g>
    ),
    baluster: (
      <g fill={o}>
        <rect x="14" y="20" width="72" height="6" rx="1.5"/>
        <rect x="14" y="74" width="72" height="6" rx="1.5"/>
        <rect x="24" y="26" width="5" height="48" rx="1"/>
        <rect x="39" y="26" width="5" height="48" rx="1"/>
        <rect x="54" y="26" width="5" height="48" rx="1"/>
        <rect x="69" y="26" width="5" height="48" rx="1"/>
      </g>
    ),
    raked: (
      <g>
        <line x1="20" y1="50" x2="80" y2="50" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <path d="M20 50 L28 42 M20 50 L28 58 M80 50 L72 42 M80 50 L72 58" stroke={o} strokeWidth="5" strokeLinecap="round" fill="none"/>
        <line x1="40" y1="30" x2="40" y2="70" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="60" y1="30" x2="60" y2="70" stroke={o} strokeWidth="5" strokeLinecap="round"/>
      </g>
    ),
    cladding: (
      <g fill={o}>
        <rect x="14" y="18" width="72" height="11" rx="2"/>
        <rect x="14" y="35" width="72" height="11" rx="2"/>
        <rect x="14" y="52" width="72" height="11" rx="2"/>
        <rect x="14" y="69" width="72" height="11" rx="2"/>
      </g>
    ),
    setout: (
      <g>
        <circle cx="50" cy="50" r="28" stroke={o} strokeWidth="5" fill="none"/>
        <line x1="50" y1="22" x2="50" y2="30" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="50" y1="70" x2="50" y2="78" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="22" y1="50" x2="30" y2="50" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <line x1="70" y1="50" x2="78" y2="50" stroke={o} strokeWidth="5" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="6" fill={o}/>
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      {icons[id] ?? <line x1="20" y1="50" x2="80" y2="50" stroke={o} strokeWidth="5" strokeLinecap="round"/>}
    </svg>
  );
}

// ─── Materials blocks ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return Number.isFinite(n) ? String(n) : '—';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {children}
    </p>
  );
}

type Row = { label: string; qty: number | null; detail: string };

function MaterialsBlock({ rows }: { rows: Row[] }) {
  return (
    <div>
      <SectionLabel>Materials</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8 }}>
            <span style={{ color: '#999' }}>{row.label}</span>
            <span style={{ color: '#0a0a0a', fontWeight: 500, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {row.qty !== null && row.qty > 1 ? `${fmt(row.qty)} × ` : ''}{row.detail}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeckingMaterials({ entry }: { entry: HistoryEntry }) {
  const deckLength = Number(entry.inputs.deckLength);
  const deckWidth = Number(entry.inputs.deckWidth);
  const boardWidth = Number(entry.inputs.boardWidth);
  const boardGap = Number(entry.inputs.boardGap);
  const joistSpacing = Number(entry.inputs.joistSpacing);
  const boardCount = Number(entry.outputs.boardCount);
  const joistCount = Number(entry.outputs.joistCount);
  const bearerCount = Number(entry.outputs.bearerCount);
  const fixingsCount = Number(entry.outputs.fixingsCount);
  const deckLengthMm = Math.round(deckLength * 1000);
  const deckWidthMm = Math.round(deckWidth * 1000);
  return (
    <>
      <MaterialsBlock rows={[
        { label: 'Decking boards', qty: boardCount, detail: `${fmt(deckWidthMm)}mm` },
        { label: 'Joists', qty: joistCount, detail: `${fmt(deckLengthMm)}mm` },
        { label: 'Bearers', qty: bearerCount, detail: `${fmt(deckWidthMm)}mm` },
        { label: 'Fixings (approx)', qty: null, detail: `${fmt(fixingsCount)} screws` },
      ]} />
      <DeckingDiagram
        deckLength={deckLengthMm} deckWidth={deckWidthMm}
        boardWidth={boardWidth} boardGap={boardGap} boardCount={boardCount}
        joistSpacing={Number.isFinite(joistSpacing) ? joistSpacing : undefined}
      />
    </>
  );
}

function FramingMaterials({ entry }: { entry: HistoryEntry }) {
  const wallLength = Number(entry.inputs.wallLength);
  const wallHeight = Number(entry.inputs.wallHeight);
  const studSpacing = Number(entry.inputs.studSpacing);
  const nogginRows = Number(entry.inputs.nogginRows);
  const includeNoggins = Number(entry.inputs.includeNoggins) === 1;
  const doubleStuds = Number(entry.inputs.doubleStuds) === 1;
  const studCount = Number(entry.outputs.studCount);
  const nogginCount = Number(entry.outputs.nogginCount);
  const topPlateLineal = Number(entry.outputs.topPlateLineal);
  const bottomPlateLineal = Number(entry.outputs.bottomPlateLineal);
  const doubleTopPlate = topPlateLineal > bottomPlateLineal * 1.5;
  const wallLengthMm = Math.round(wallLength * 1000);
  const wallHeightMm = Math.round(wallHeight * 1000);
  const nogginLengthMm = Math.round(studSpacing - 90);
  const rows: Row[] = [
    { label: 'Studs', qty: studCount, detail: `${fmt(wallHeightMm)}mm` },
    { label: `Top plate (${doubleTopPlate ? '2 runs' : '1 run'})`, qty: doubleTopPlate ? 2 : 1, detail: `${fmt(wallLengthMm)}mm` },
    { label: 'Bottom plate', qty: 1, detail: `${fmt(wallLengthMm)}mm` },
  ];
  if (includeNoggins && nogginCount > 0) rows.push({ label: 'Nogs', qty: nogginCount, detail: `${fmt(nogginLengthMm)}mm` });
  return (
    <>
      <MaterialsBlock rows={rows} />
      <FramingDiagram wallLengthMm={wallLengthMm} wallHeightMm={wallHeightMm} studCount={studCount}
        studSpacingMm={studSpacing} nogginRows={includeNoggins ? (nogginRows || 1) : 0}
        doubleTopPlate={doubleTopPlate} doubleStuds={doubleStuds} />
    </>
  );
}

function StairsMaterials({ entry }: { entry: HistoryEntry }) {
  const totalRise = Number(entry.inputs.totalRise);
  const totalRun = Number(entry.inputs.totalRun);
  const riserCount = Number(entry.outputs.riserCount);
  const treadCount = Number(entry.outputs.treadCount);
  const riserHeight = Number(entry.outputs.riserHeight);
  const treadDepth = Number(entry.outputs.treadDepth);
  const stringerLength = Number(entry.outputs.stringerLength);
  const effectiveRun = totalRun > 0 ? totalRun : treadCount * treadDepth;
  return (
    <>
      <MaterialsBlock rows={[
        { label: 'Stringers', qty: 2, detail: `${fmt(stringerLength)}mm` },
        { label: 'Treads', qty: treadCount, detail: `${fmt(treadDepth)}mm deep` },
        { label: 'Risers', qty: riserCount, detail: `${fmt(riserHeight)}mm high` },
      ]} />
      <StairDiagram riserCount={riserCount} riserHeight={riserHeight} treadDepth={treadDepth}
        stringerLength={stringerLength} totalRise={totalRise} totalRun={effectiveRun} />
    </>
  );
}

function RoofMaterials({ entry }: { entry: HistoryEntry }) {
  const span = Number(entry.inputs.span ?? entry.inputs.buildingWidth);
  const pitchDegrees = Number(entry.outputs.pitchDegrees ?? entry.inputs.pitchDegrees);
  const overhang = Number(entry.inputs.overhang);
  const totalRafterLength = Number(entry.outputs.totalRafterLength);
  const ridgeHeight = Number(entry.outputs.ridgeHeight);
  const plumbCutAngle = Number(entry.outputs.plumbCutAngle);
  const seatCutAngle = Number(entry.outputs.seatCutAngle);
  return (
    <>
      <MaterialsBlock rows={[
        { label: 'Span', qty: null, detail: `${fmt(span)}m` },
        { label: 'Pitch', qty: null, detail: `${fmt(pitchDegrees)}°` },
        { label: 'Rafter length (each)', qty: null, detail: `${fmt(totalRafterLength)}m` },
        { label: 'Ridge height', qty: null, detail: `${fmt(ridgeHeight)}m` },
        { label: 'Plumb cut', qty: null, detail: `${fmt(plumbCutAngle)}°` },
        { label: 'Seat cut', qty: null, detail: `${fmt(seatCutAngle)}°` },
      ]} />
      <RoofDiagram buildingWidthMm={span * 1000} pitchDegrees={pitchDegrees}
        ridgeHeightMm={ridgeHeight * 1000} rafterLengthMm={Math.round(totalRafterLength * 1000)}
        overhangMm={Number.isFinite(overhang) ? overhang * 1000 : 0} />
    </>
  );
}

function BalusterMaterials({ entry }: { entry: HistoryEntry }) {
  const totalLength = Number(entry.inputs.totalLength);
  const balusterWidth = Number(entry.inputs.balusterWidth);
  const balusters = Number(entry.outputs.balusters);
  const actualGap = Number(entry.outputs.actualGap);
  return (
    <>
      <MaterialsBlock rows={[
        { label: 'Balusters', qty: balusters, detail: `${fmt(balusterWidth)}mm wide` },
        { label: 'Gap between', qty: null, detail: `${fmt(actualGap)}mm` },
      ]} />
      <BalusterDiagram totalLength={totalLength} balusterWidth={balusterWidth} balusterCount={balusters} gap={actualGap} />
    </>
  );
}

function ConcreteMaterials({ entry }: { entry: HistoryEntry }) {
  const type = String(entry.inputs.type);
  if (type === 'slab') {
    return <MaterialsBlock rows={[
      { label: 'Slab', qty: null, detail: `${fmt(Number(entry.inputs.length))} × ${fmt(Number(entry.inputs.width))} × ${fmt(Number(entry.inputs.thickness))}mm` },
      { label: 'Order volume', qty: null, detail: `${fmt(Number(entry.outputs.orderVolume))} m³` },
      { label: 'Litres', qty: null, detail: `${fmt(Number(entry.outputs.litres))} L` },
      { label: 'Weight', qty: null, detail: `${fmt(Number(entry.outputs.weightTonnes))} t` },
    ]} />;
  }
  const useBagMix = Number(entry.outputs.useBagMix) === 1;
  return <MaterialsBlock rows={[
    { label: 'Holes', qty: Number(entry.inputs.numHoles), detail: `${fmt(Number(entry.inputs.depth))}mm deep` },
    useBagMix
      ? { label: 'Bag mix (20 kg)', qty: Number(entry.outputs.bagCount), detail: 'bags' }
      : { label: 'Ready-mix', qty: null, detail: `${fmt(Number(entry.outputs.orderVolume))} m³` },
  ]} />;
}

function CladdingMaterials({ entry }: { entry: HistoryEntry }) {
  return <MaterialsBlock rows={[
    { label: 'Courses', qty: Number(entry.outputs.courseCount), detail: `${fmt(Number(entry.outputs.faceCover))}mm cover` },
    { label: `Cladding boards (${fmt(Number(entry.inputs.boardLength))}mm)`, qty: Number(entry.outputs.stockCount), detail: `${fmt(Number(entry.outputs.totalLm))}lm` },
  ]} />;
}

function RakedMaterials({ entry }: { entry: HistoryEntry }) {
  return <MaterialsBlock rows={[
    { label: 'Studs (varying heights)', qty: Number(entry.outputs.studCount), detail: `${fmt(Number(entry.outputs.lowStudHeight))}–${fmt(Number(entry.outputs.highStudHeight))}mm` },
    { label: 'Rake plate', qty: 1, detail: `${fmt(Number(entry.outputs.rakePlateLength))}mm` },
    { label: 'Bottom plate', qty: 1, detail: `${fmt(Math.round(Number(entry.outputs.bottomPlateLineal) * 1000))}mm` },
  ]} />;
}

function SetoutMaterials({ entry }: { entry: HistoryEntry }) {
  const error = Number(entry.outputs.error);
  return <MaterialsBlock rows={[
    { label: 'Sides', qty: null, detail: `${fmt(Number(entry.inputs.sideA))} × ${fmt(Number(entry.inputs.sideB))}mm` },
    { label: 'Required diagonal', qty: null, detail: `${fmt(Number(entry.outputs.diagonal))}mm` },
    ...(error !== 0 && Number.isFinite(error)
      ? [{ label: 'Error', qty: null, detail: `${error > 0 ? '+' : ''}${fmt(error)}mm` }]
      : []),
  ]} />;
}

function MaterialsForCalc({ entry }: { entry: HistoryEntry }) {
  switch (entry.calculatorId) {
    case 'decking':  return <DeckingMaterials entry={entry} />;
    case 'framing':  return <FramingMaterials entry={entry} />;
    case 'stairs':   return <StairsMaterials entry={entry} />;
    case 'roof':     return <RoofMaterials entry={entry} />;
    case 'baluster': return <BalusterMaterials entry={entry} />;
    case 'concrete': return <ConcreteMaterials entry={entry} />;
    case 'cladding': return <CladdingMaterials entry={entry} />;
    case 'raked':    return <RakedMaterials entry={entry} />;
    case 'setout':   return <SetoutMaterials entry={entry} />;
    default:         return null;
  }
}

// ─── Order card ───────────────────────────────────────────────────────────────

const BUFFER_OPTIONS = [0, 5, 10, 15];

function OrderRow({ line, bufferPct, onLineChange, onRemove }: {
  line: OrderLine;
  bufferPct: number;
  onLineChange: (id: string, changes: { name?: string; unit?: string; qty?: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(line.name);
  const [draftQty, setDraftQty] = useState(String(line.qty));
  const [draftUnit, setDraftUnit] = useState(line.unit);
  const noBuffer = line.unit === 'm³';
  const buffed = noBuffer ? line.qty : applyBuffer(line.qty, bufferPct);
  const showOriginal = !noBuffer && bufferPct > 0 && buffed !== line.qty;

  function commit() {
    const n = parseFloat(draftQty);
    onLineChange(line.id, {
      name: draftName.trim() || line.name,
      unit: draftUnit.trim() || line.unit,
      qty: Number.isFinite(n) && n >= 0 ? n : line.qty,
    });
    setEditing(false);
  }

  return (
    <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
      <button
        onClick={() => { setDraftName(line.name); setDraftQty(String(line.qty)); setDraftUnit(line.unit); setEditing(e => !e); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
            {line.name}
          </p>
          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
            {line.sources.map(s => (
              <span key={s} style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--color-muted)', background: 'rgba(0,0,0,0.045)', borderRadius: 5, padding: '2px 6px' }}>
                {s}
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
            {showOriginal && (
              <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 500, textDecoration: 'line-through', marginRight: 5 }}>
                {line.qty.toLocaleString()}
              </span>
            )}
            {line.approx ? '~' : ''}{buffed.toLocaleString()}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--color-muted)' }}>{line.unit}</p>
        </div>
      </button>

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px 10px' }}>
          <input
            type="text" value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); }}
            placeholder="Material name"
            style={{
              padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border)',
              background: 'var(--color-bg)', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" inputMode="decimal" value={draftQty}
              onChange={e => setDraftQty(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); }}
              style={{
                flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border)',
                background: 'var(--color-bg)', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
              }}
            />
            <input
              type="text" value={draftUnit}
              onChange={e => setDraftUnit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); }}
              placeholder="Unit"
              style={{
                flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border)',
                background: 'var(--color-bg)', fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={commit}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--color-orange)', color: '#fff', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Save
            </button>
            <button
              onClick={() => { onRemove(line.id); setEditing(false); }}
              style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '0.5px solid var(--color-border)', background: 'none', color: '#e53e3e', fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddMaterialForm({ onAdd }: { onAdd: (name: string, qty: number, unit: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('each');

  function handleAdd() {
    const q = parseFloat(qty);
    if (!name.trim() || !Number.isFinite(q) || q <= 0) return;
    onAdd(name.trim(), q, unit.trim() || 'each');
    setName(''); setQty(''); setUnit('each');
    setShowForm(false);
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', padding: '11px 0', borderRadius: 10, border: '0.5px dashed rgba(0,0,0,0.18)',
          background: 'none', color: 'var(--color-orange)', fontSize: 13, fontWeight: 500,
          fontFamily: 'inherit', cursor: 'pointer', marginTop: 10,
        }}
      >
        + Add material
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10,
      padding: '12px', borderRadius: 12, border: '0.5px solid var(--color-border)', background: 'var(--color-card)',
    }}>
      <input
        type="text" placeholder="Material name" value={name}
        onChange={e => setName(e.target.value)}
        style={{ padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="number" inputMode="decimal" placeholder="Qty" value={qty}
          onChange={e => setQty(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
        />
        <input
          type="text" placeholder="Unit" value={unit}
          onChange={e => setUnit(e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 9, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setShowForm(false)}
          style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '0.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-muted)', fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !qty.trim()}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
            background: name.trim() && qty.trim() ? 'var(--color-orange)' : 'var(--color-border)',
            color: name.trim() && qty.trim() ? '#fff' : 'var(--color-muted)',
            fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
            cursor: name.trim() && qty.trim() ? 'pointer' : 'default',
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// Applies the tradie's manual qty overrides / removals / added lines on top of the auto-built
// order from calculations — so Copy/Send always reflects what's actually on screen, not just
// whatever the linked calculators computed.
function applyManualEdits(order: JobOrder, job: SavedJob): JobOrder {
  const removed = new Set(job.orderRemovedIds ?? []);
  const qtyOverrides = job.orderQtyOverrides ?? {};
  const lineOverrides = job.orderLineOverrides ?? {};

  function adjust(lines: OrderLine[]): OrderLine[] {
    return lines
      .filter(l => !removed.has(l.id))
      .map(l => {
        const lineOverride = lineOverrides[l.id];
        const qty = qtyOverrides[l.id] !== undefined ? qtyOverrides[l.id] : l.qty;
        if (qty === l.qty && !lineOverride) return l;
        return { ...l, qty, name: lineOverride?.name ?? l.name, unit: lineOverride?.unit ?? l.unit };
      });
  }

  const timber = adjust(order.timber);
  const concrete = adjust(order.concrete);
  const fixings = adjust(order.fixings);
  const extras: OrderLine[] = (job.orderExtraLines ?? []).map(x => ({ id: x.id, name: x.name, qty: x.qty, unit: x.unit, sources: ['Manual'] }));
  const other = [...adjust(order.other), ...extras];

  // Keep the loose-timber (e.g. fence rail) contribution intact — only re-sum the grouped timber
  // lines, which are the only part of the total an edit could actually touch.
  const lm = (lines: OrderLine[]) => lines.reduce((s, l) => s + ((l.lengthMm ?? 0) / 1000) * l.qty, 0);
  const timberLinealM = parseFloat((order.timberLinealM - lm(order.timber) + lm(timber)).toFixed(1));

  return { timber, concrete, fixings, other, timberLinealM };
}

function OrderGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, padding: '10px 14px 4px', fontSize: 10, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </p>
  );
}

function OrderCard({ entries, job, updateJob }: {
  entries: HistoryEntry[];
  job: SavedJob;
  updateJob: (id: string, updates: Partial<SavedJob>) => void;
}) {
  const [bufferPct, setBufferPct] = useState(0);
  const [copied, setCopied] = useState(false);

  const order = applyManualEdits(buildJobOrder(entries), job);
  const hasLines = order.timber.length + order.concrete.length + order.fixings.length + order.other.length > 0;

  function handleLineChange(id: string, changes: { name?: string; unit?: string; qty?: number }) {
    const updates: Partial<SavedJob> = {};
    if (changes.qty !== undefined) {
      updates.orderQtyOverrides = { ...(job.orderQtyOverrides ?? {}), [id]: changes.qty };
    }
    if (changes.name !== undefined || changes.unit !== undefined) {
      const existing = job.orderLineOverrides ?? {};
      updates.orderLineOverrides = {
        ...existing,
        [id]: { ...existing[id], ...(changes.name !== undefined ? { name: changes.name } : {}), ...(changes.unit !== undefined ? { unit: changes.unit } : {}) },
      };
    }
    updateJob(job.id, updates);
  }

  function handleRemove(id: string) {
    const removed = job.orderRemovedIds ?? [];
    if (removed.includes(id)) return;
    updateJob(job.id, { orderRemovedIds: [...removed, id] });
  }

  function handleAddMaterial(name: string, qty: number, unit: string) {
    const extras = job.orderExtraLines ?? [];
    updateJob(job.id, { orderExtraLines: [...extras, { id: uuid(), name, qty, unit }] });
  }

  if (!hasLines) {
    return (
      <div style={{ padding: '0 18px 4px' }}>
        <AddMaterialForm onAdd={handleAddMaterial} />
      </div>
    );
  }

  const orderText = formatOrderText(order, job.name, bufferPct);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: orderText });
        return;
      } catch { /* user cancelled — fall through to copy */ }
    }
    handleCopy();
  }

  function handleCopy() {
    navigator.clipboard?.writeText(orderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ padding: '0 18px 4px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        {BUFFER_OPTIONS.map(pct => {
          const active = bufferPct === pct;
          return (
            <button
              key={pct}
              onClick={() => setBufferPct(pct)}
              style={{
                padding: '9px 0', borderRadius: 12, fontSize: 12.5, fontWeight: 500,
                fontFamily: 'inherit', cursor: 'pointer',
                border: '0.5px solid var(--color-border)',
                background: active ? 'var(--color-orange)' : 'var(--color-card)',
                color: active ? '#fff' : 'var(--color-text)',
                transition: 'all 0.15s ease',
              }}
            >
              {pct === 0 ? 'No buffer' : `+${pct}%`}
            </button>
          );
        })}
      </div>

      <div style={{ background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-card)', boxShadow: '0 1px 2px rgba(0,0,0,0.025)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '13px 14px 8px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--color-text)' }}>Order</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-orange)' }}>
            {bufferPct === 0 ? 'No buffer' : `+${bufferPct}% buffer applied`}
          </span>
        </div>

        {order.timber.length > 0 && (
          <>
            <OrderGroupLabel>Timber</OrderGroupLabel>
            {order.timber.map(l => <OrderRow key={l.id} line={l} bufferPct={bufferPct} onLineChange={handleLineChange} onRemove={handleRemove} />)}
          </>
        )}
        {order.concrete.length > 0 && (
          <>
            <OrderGroupLabel>Concrete</OrderGroupLabel>
            {order.concrete.map(l => <OrderRow key={l.id} line={l} bufferPct={bufferPct} onLineChange={handleLineChange} onRemove={handleRemove} />)}
          </>
        )}
        {order.fixings.length > 0 && (
          <>
            <OrderGroupLabel>Fixings</OrderGroupLabel>
            {order.fixings.map(l => <OrderRow key={l.id} line={l} bufferPct={bufferPct} onLineChange={handleLineChange} onRemove={handleRemove} />)}
          </>
        )}
        {order.other.length > 0 && (
          <>
            <OrderGroupLabel>Other</OrderGroupLabel>
            {order.other.map(l => <OrderRow key={l.id} line={l} bufferPct={bufferPct} onLineChange={handleLineChange} onRemove={handleRemove} />)}
          </>
        )}

        {order.timberLinealM > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', background: 'rgba(255,90,31,0.05)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--color-orange)' }}>Timber total</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
              {applyBuffer(order.timberLinealM, bufferPct)} lm
            </span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 10 }}>
        <AddMaterialForm onAdd={handleAddMaterial} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={handleShare}
          style={{
            flex: 1, padding: '13px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'var(--color-orange)', color: '#fff', fontSize: 14.5, fontWeight: 500, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Send to supplier
        </button>
        <button
          onClick={handleCopy}
          style={{
            padding: '13px 16px', borderRadius: 14, cursor: 'pointer',
            border: '0.5px solid var(--color-border)', background: copied ? '#22c55e' : 'var(--color-card)',
            color: copied ? '#fff' : 'var(--color-text)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
            transition: 'all 0.2s', whiteSpace: 'nowrap',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0 8px' }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>{count}</p>
    </div>
  );
}

// ─── CalcEntryCard ────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 88;

function CalcEntryCard({ entry, onRemove }: { entry: HistoryEntry; onRemove: (id: string) => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const hasSwiped = useRef(false);

  const meta = CALCULATORS.find(c => c.id === entry.calculatorId);
  const firstOutput = Object.entries(entry.outputs)[0];
  const keyValue = firstOutput ? String(firstOutput[1]) : '—';
  const keyLabel = firstOutput ? cleanKey(firstOutput[0]) : '';

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    hasSwiped.current = false;
    setIsSwiping(true);
  }
  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 6) hasSwiped.current = true;
    setSwipeX(Math.min(0, Math.max(-(SWIPE_THRESHOLD + 20), dx)));
  }
  function handleTouchEnd() {
    setIsSwiping(false);
    setSwipeX(swipeX < -(SWIPE_THRESHOLD / 2) ? -SWIPE_THRESHOLD : 0);
  }
  function handleCardClick() {
    if (hasSwiped.current || swipeX < 0) { setSwipeX(0); return; }
    setExpanded(e => !e);
  }

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: SWIPE_THRESHOLD,
        background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Fully transparent at rest, in sync with the card's slide transition
        // — otherwise the card's antialiased rounded-corner edge blends
        // against solid red sitting directly behind it, leaving a hairline
        // red tint at the corner even though the bounds match exactly.
        opacity: swipeX < 0 ? 1 : 0,
        transition: isSwiping ? 'none' : 'opacity 0.2s ease',
      }}>
        <button onClick={() => onRemove(entry.id)} style={{
          background: 'none', border: 'none', color: '#fff',
          fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
        }}>
          Remove
        </button>
      </div>

      <div
        role="button" tabIndex={0}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
        style={{
          background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
          borderTopLeftRadius: 14, borderTopRightRadius: 14,
          borderBottomLeftRadius: expanded ? 0 : 14, borderBottomRightRadius: expanded ? 0 : 14,
          borderBottom: expanded ? 'none' : '0.5px solid var(--color-border)',
          overflow: 'hidden',
          // Omit at rest rather than translateX(0px) — a zero-value transform
          // still promotes this to its own compositing layer, whose
          // anti-aliased rounded corners don't perfectly align with the
          // parent clip, leaking a hairline of the red delete background.
          ...(swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : {}),
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          position: 'relative', zIndex: 1, cursor: 'pointer', userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.025)',
        }}
      >
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'rgba(255,90,31,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CalcIcon id={entry.calculatorId} size={24} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
              {meta?.label ?? entry.calculatorId}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {timeStr(entry.timestamp)}
            </p>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums' }}>
              {keyValue}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--color-muted)' }}>
              {keyLabel}
            </p>
          </div>

          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div style={{
          background: 'var(--color-card)', border: '0.5px solid var(--color-border)', borderTop: 'none',
          borderBottomLeftRadius: 14, borderBottomRightRadius: 14, marginTop: -1,
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12,
          position: 'relative', zIndex: 1,
        }}>
          <MaterialsForCalc entry={entry} />
          <div>
            <SectionLabel>Inputs</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(entry.inputs).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>{cleanKey(key)}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Results</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {Object.entries(entry.outputs)
                .filter(([key]) => key !== 'materialsJson' && key !== 'quoteStateJson')
                .map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>{cleanKey(key)}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
          {entry.calculatorId === 'photoquote' && typeof entry.outputs.quoteStateJson === 'string' && (
            <button
              onClick={() => navigate('/calc/photoquote', { state: { resumeEntryId: entry.id } })}
              style={{
                background: 'var(--color-orange)', border: 'none', borderRadius: 10,
                padding: '10px 14px', fontSize: 13, color: '#fff', fontFamily: 'inherit',
                cursor: 'pointer', fontWeight: 500,
              }}
            >
              Edit quote
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      onPointerDown={e => (e.currentTarget.style.borderColor = 'rgba(255,90,31,0.4)')}
      onPointerUp={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)')}
      onPointerLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)')}
      style={{
        width: '100%',
        margin: '8px 0', padding: '40px 20px',
        background: 'var(--color-card)', border: '0.5px dashed rgba(0,0,0,0.18)', borderRadius: 18,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
        fontFamily: 'inherit', cursor: 'pointer',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: 'rgba(255,90,31,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>No calcs yet</p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', maxWidth: 240, lineHeight: 1.5 }}>
        Tap here or the + button to add your first calculation.
      </p>
    </button>
  );
}

// ─── JobDetailPage ────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = { today: 'Today', yesterday: 'Yesterday', older: 'Older' };
const GROUP_ORDER = ['today', 'yesterday', 'older'] as const;

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob, getJobCalculations, removeCalculationFromJob } = useContext(JobsContext);
  const { inset: keyboardInset } = useContext(KeyboardContext);

  const job = jobs.find(j => j.id === id);

  const [showMenu, setShowMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameDraft, setRenameDraft] = useState(job?.name ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [notesDraft, setNotesDraft] = useState(job?.notes ?? '');
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (job) { setRenameDraft(job.name); setNotesDraft(job.notes); }
  }, [job?.id]);

  function openRename() {
    if (!job) return;
    // flushSync + immediate focus keeps this inside the click's trusted
    // gesture — a focus() reached via setTimeout instead opens the iOS
    // keyboard without binding it, so nothing typed ever registers.
    flushSync(() => { setShowMenu(false); setRenameDraft(job.name); setShowRename(true); });
    renameInputRef.current?.focus();
  }

  function openNotesSheet() {
    if (!job) return;
    flushSync(() => { setNotesDraft(job.notes); setShowNotesSheet(true); });
    const el = notesRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }

  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (!job) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>Job not found</div>;
  }

  const calculations = getJobCalculations(job.id);

  const grouped: Record<string, HistoryEntry[]> = { today: [], yesterday: [], older: [] };
  for (const c of calculations) grouped[dayGroup(c.timestamp)].push(c);

  function handleRename() {
    if (!renameDraft.trim() || renameDraft.trim() === job!.name) { setShowRename(false); return; }
    updateJob(job!.id, { name: renameDraft.trim() });
    setShowRename(false);
  }

  function handleSaveNotes() {
    updateJob(job!.id, { notes: notesDraft.trim() });
    setShowNotesSheet(false);
  }

  function handleDelete() {
    deleteJob(job!.id);
    navigate('/jobs', { replace: true });
  }

  function handleAddCalc() {
    sessionStorage.setItem('setout_pending_job', job!.id);
    navigate('/');
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: 'calc(env(safe-area-inset-top) + 20px) 16px 14px', gap: 10,
        position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 10,
      }}>
        <button onClick={() => navigate('/jobs')} style={{
          background: 'none', border: 'none', padding: '4px 6px 4px 0', cursor: 'pointer',
          color: 'var(--color-orange)', display: 'flex', alignItems: 'center', gap: 3,
          fontSize: 15, fontWeight: 500, fontFamily: 'inherit', flexShrink: 0, minHeight: 44,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Jobs
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.5px', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {job.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
            {calculations.length === 0
              ? `No calcs yet · ${relativeTime(job.createdAt)}`
              : `${calculations.length} ${calculations.length === 1 ? 'calc' : 'calcs'} · last edit ${relativeTime(job.updatedAt)}`}
          </p>
        </div>

        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowMenu(m => !m)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
            color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 44, minHeight: 44,
          }}>
            <svg width="4" height="18" viewBox="0 0 4 18" fill="currentColor">
              <circle cx="2" cy="2" r="2"/><circle cx="2" cy="9" r="2"/><circle cx="2" cy="16" r="2"/>
            </svg>
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', background: '#fff',
              border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 160, zIndex: 50, overflow: 'hidden',
            }}>
              <button onClick={openRename} style={menuItemStyle}>Rename</button>
              <div style={{ height: 0.5, background: 'rgba(0,0,0,0.06)' }} />
              <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} style={{ ...menuItemStyle, color: '#e53e3e' }}>Delete job</button>
            </div>
          )}
        </div>
      </div>

      {/* Notes card */}
      <div style={{ padding: '16px 18px 14px' }}>
        <button
          onClick={openNotesSheet}
          onPointerDown={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
          onPointerUp={e => (e.currentTarget.style.background = 'var(--color-card)')}
          onPointerLeave={e => (e.currentTarget.style.background = 'var(--color-card)')}
          style={{
            width: '100%', background: 'var(--color-card)', border: '0.5px solid var(--color-border)',
            borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.025)', fontFamily: 'inherit', textAlign: 'left',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M4 6h16M4 12h16M4 18h10" stroke="var(--color-muted)" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontSize: 13.5, letterSpacing: '-0.2px',
            color: job.notes ? 'var(--color-text)' : 'var(--color-muted)',
            whiteSpace: job.notes ? 'pre-wrap' : 'nowrap',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}>
            {job.notes || 'Add notes… (address, client, phone)'}
          </span>
        </button>
      </div>


      {/* Consolidated order */}
      {calculations.length > 0 && <OrderCard entries={calculations} job={job} updateJob={updateJob} />}

      {/* Calc list */}
      <div style={{ flex: 1, padding: '14px 18px 100px', display: 'flex', flexDirection: 'column' }}>
        {calculations.length === 0 ? (
          <EmptyState onAdd={handleAddCalc} />
        ) : (
          GROUP_ORDER.map(g => {
            const group = grouped[g];
            if (group.length === 0) return null;
            return (
              <div key={g}>
                <GroupHeader label={GROUP_LABELS[g]} count={group.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {group.map(entry => (
                    <CalcEntryCard
                      key={entry.id}
                      entry={entry}
                      onRemove={calcId => removeCalculationFromJob(job.id, calcId)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <div style={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'flex-end', paddingRight: 20, paddingBottom: 4, pointerEvents: 'none', flexShrink: 0 }}>
        <button onClick={handleAddCalc} aria-label="Add calc" style={{
          width: 54, height: 54, borderRadius: '50%', background: 'var(--color-orange)',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(255,90,31,0.38)', pointerEvents: 'auto',
        }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Notes sheet */}
      {showNotesSheet && (
        <>
          <div onClick={() => setShowNotesSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={getSheetStyle(keyboardInset)}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Notes</h2>
            <textarea ref={notesRef} value={notesDraft} onChange={e => setNotesDraft(e.target.value)}
              placeholder="Address, client name, phone…" rows={4}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', background: 'var(--color-bg)', fontSize: 15, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none', resize: 'none', boxSizing: 'border-box', lineHeight: 1.5, WebkitAppearance: 'none' } as React.CSSProperties}
            />
            <button onClick={handleSaveNotes} style={sheetPrimaryBtn}>Save notes</button>
          </div>
        </>
      )}

      {/* Rename sheet */}
      {showRename && (
        <>
          <div onClick={() => setShowRename(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={getSheetStyle(keyboardInset)}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Rename job</h2>
            <input ref={renameInputRef} type="text" value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
              style={{ padding: '14px 16px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.12)', background: 'var(--color-bg)', fontSize: 16, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none', WebkitAppearance: 'none' }}
            />
            <button onClick={handleRename} disabled={!renameDraft.trim()} style={{
              ...sheetPrimaryBtn,
              background: renameDraft.trim() ? 'var(--color-orange)' : 'rgba(0,0,0,0.08)',
              color: renameDraft.trim() ? '#fff' : '#999',
              cursor: renameDraft.trim() ? 'pointer' : 'default',
            }}>Save</button>
          </div>
        </>
      )}

      {/* Delete confirm sheet */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={getSheetStyle(keyboardInset)}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Delete "{job.name}"?</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              The job will be deleted. Your calculations stay in History.
            </p>
            <button onClick={handleDelete} style={{ ...sheetPrimaryBtn, background: '#e53e3e' }}>Delete job</button>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ padding: '14px', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)', background: 'none', color: 'var(--color-muted)', fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

function getSheetStyle(keyboardInset: number): React.CSSProperties {
  return {
    position: 'fixed', bottom: 0, left: '50%',
    transform: `translateX(-50%) translateY(-${keyboardInset}px)`,
    width: '100%', maxWidth: 390, background: '#fff', borderRadius: '20px 20px 0 0',
    padding: `20px 20px ${keyboardInset > 0 ? '24px' : 'calc(env(safe-area-inset-bottom) + 24px)'}`,
    zIndex: 201, display: 'flex', flexDirection: 'column', gap: 14,
    transition: 'transform 0.2s ease',
  };
}
const sheetHandleStyle: React.CSSProperties = {
  width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 4,
};
const sheetTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.4px',
};
const sheetPrimaryBtn: React.CSSProperties = {
  padding: '16px', borderRadius: 14, border: 'none',
  background: 'var(--color-orange)', color: '#fff',
  fontSize: 16, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
};
const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 16px', background: 'none', border: 'none',
  cursor: 'pointer', textAlign: 'left', fontSize: 14, fontFamily: 'inherit', color: '#0a0a0a',
};
