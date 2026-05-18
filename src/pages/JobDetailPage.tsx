import { useState, useContext, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobsContext, SettingsContext, HistoryContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import { estimateEntryCost, formatCost } from '../lib/jobCost';
import type { HistoryEntry } from '../types';
import { DeckingDiagram } from '../components/DeckingDiagram';
import { FramingDiagram } from '../components/FramingDiagram';
import { StairDiagram } from '../components/StairDiagram';
import { RoofDiagram } from '../components/RoofDiagram';
import { BalusterDiagram } from '../components/BalusterDiagram';

// ─── helpers ────────────────────────────────────────────────────────────────

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
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// ─── Per-calculator material & diagram views ───────────────────────────────

function fmt(n: number): string {
  return Number.isFinite(n) ? String(n) : '—';
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '0 0 6px',
      fontSize: 10,
      fontWeight: 500,
      color: '#999',
      textTransform: 'uppercase',
      letterSpacing: '0.4px',
    }}>
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
        deckLength={deckLengthMm}
        deckWidth={deckWidthMm}
        boardWidth={boardWidth}
        boardGap={boardGap}
        boardCount={boardCount}
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
  // doubleTopPlate isn't stored, but topPlateLineal vs bottomPlateLineal tells us
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
  if (includeNoggins && nogginCount > 0) {
    rows.push({ label: 'Noggins', qty: nogginCount, detail: `${fmt(nogginLengthMm)}mm` });
  }

  return (
    <>
      <MaterialsBlock rows={rows} />
      <FramingDiagram
        wallLengthMm={wallLengthMm}
        wallHeightMm={wallHeightMm}
        studCount={studCount}
        studSpacingMm={studSpacing}
        nogginRows={includeNoggins ? (nogginRows || 1) : 0}
        doubleTopPlate={doubleTopPlate}
        doubleStuds={doubleStuds}
      />
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
      <StairDiagram
        riserCount={riserCount}
        riserHeight={riserHeight}
        treadDepth={treadDepth}
        stringerLength={stringerLength}
        totalRise={totalRise}
        totalRun={effectiveRun}
      />
    </>
  );
}

function RoofMaterials({ entry }: { entry: HistoryEntry }) {
  // Support both new (span) and old (buildingWidth) saved entries
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
      <RoofDiagram
        buildingWidthMm={span * 1000}
        pitchDegrees={pitchDegrees}
        ridgeHeightMm={ridgeHeight * 1000}
        rafterLengthMm={Math.round(totalRafterLength * 1000)}
        overhangMm={Number.isFinite(overhang) ? overhang * 1000 : 0}
      />
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
      <BalusterDiagram
        totalLength={totalLength}
        balusterWidth={balusterWidth}
        balusterCount={balusters}
        gap={actualGap}
      />
    </>
  );
}

function ConcreteMaterials({ entry }: { entry: HistoryEntry }) {
  const type = String(entry.inputs.type);
  if (type === 'slab') {
    const length = Number(entry.inputs.length);
    const width = Number(entry.inputs.width);
    const thickness = Number(entry.inputs.thickness);
    const orderVolume = Number(entry.outputs.orderVolume);
    const litres = Number(entry.outputs.litres);
    const weightTonnes = Number(entry.outputs.weightTonnes);
    return <MaterialsBlock rows={[
      { label: 'Slab', qty: null, detail: `${fmt(length)} × ${fmt(width)} × ${fmt(thickness)}mm` },
      { label: 'Order volume', qty: null, detail: `${fmt(orderVolume)} m³` },
      { label: 'Litres', qty: null, detail: `${fmt(litres)} L` },
      { label: 'Weight', qty: null, detail: `${fmt(weightTonnes)} t` },
    ]} />;
  }
  // postholes
  const numHoles = Number(entry.inputs.numHoles);
  const depth = Number(entry.inputs.depth);
  const orderVolume = Number(entry.outputs.orderVolume);
  const bagCount = Number(entry.outputs.bagCount);
  const useBagMix = Number(entry.outputs.useBagMix) === 1;
  return <MaterialsBlock rows={[
    { label: 'Holes', qty: numHoles, detail: `${fmt(depth)}mm deep` },
    useBagMix
      ? { label: 'Bag mix (20 kg)', qty: bagCount, detail: 'bags' }
      : { label: 'Ready-mix', qty: null, detail: `${fmt(orderVolume)} m³` },
  ]} />;
}

function CladdingMaterials({ entry }: { entry: HistoryEntry }) {
  const boardLength = Number(entry.inputs.boardLength);
  const courseCount = Number(entry.outputs.courseCount);
  const faceCover = Number(entry.outputs.faceCover);
  const totalLm = Number(entry.outputs.totalLm);
  const stockCount = Number(entry.outputs.stockCount);
  return <MaterialsBlock rows={[
    { label: 'Courses', qty: courseCount, detail: `${fmt(faceCover)}mm cover` },
    { label: `Cladding boards (${fmt(boardLength)}mm)`, qty: stockCount, detail: `${fmt(totalLm)}lm` },
  ]} />;
}

function RakedMaterials({ entry }: { entry: HistoryEntry }) {
  const studCount = Number(entry.outputs.studCount);
  const lowStudHeight = Number(entry.outputs.lowStudHeight);
  const highStudHeight = Number(entry.outputs.highStudHeight);
  const rakePlateLength = Number(entry.outputs.rakePlateLength);
  const bottomPlateLineal = Number(entry.outputs.bottomPlateLineal);
  return <MaterialsBlock rows={[
    { label: 'Studs (varying heights)', qty: studCount, detail: `${fmt(lowStudHeight)}–${fmt(highStudHeight)}mm` },
    { label: 'Rake plate', qty: 1, detail: `${fmt(rakePlateLength)}mm` },
    { label: 'Bottom plate', qty: 1, detail: `${fmt(Math.round(bottomPlateLineal * 1000))}mm` },
  ]} />;
}

function SetoutMaterials({ entry }: { entry: HistoryEntry }) {
  const diagonal = Number(entry.outputs.diagonal);
  const error = Number(entry.outputs.error);
  const sideA = Number(entry.inputs.sideA);
  const sideB = Number(entry.inputs.sideB);
  return <MaterialsBlock rows={[
    { label: 'Sides', qty: null, detail: `${fmt(sideA)} × ${fmt(sideB)}mm` },
    { label: 'Required diagonal', qty: null, detail: `${fmt(diagonal)}mm` },
    ...(error !== 0 && Number.isFinite(error)
      ? [{ label: 'Error', qty: null, detail: `${error > 0 ? '+' : ''}${fmt(error)}mm` }]
      : []),
  ]} />;
}

function MaterialsForCalc({ entry }: { entry: HistoryEntry }) {
  switch (entry.calculatorId) {
    case 'decking': return <DeckingMaterials entry={entry} />;
    case 'framing': return <FramingMaterials entry={entry} />;
    case 'stairs': return <StairsMaterials entry={entry} />;
    case 'roof': return <RoofMaterials entry={entry} />;
    case 'baluster': return <BalusterMaterials entry={entry} />;
    case 'concrete': return <ConcreteMaterials entry={entry} />;
    case 'cladding': return <CladdingMaterials entry={entry} />;
    case 'raked': return <RakedMaterials entry={entry} />;
    case 'setout': return <SetoutMaterials entry={entry} />;
    default: return null;
  }
}

// ─── CalcEntryCard ───────────────────────────────────────────────────────────

interface CalcEntryCardProps {
  entry: HistoryEntry;
  cost: number | null;
  onRemove: (calcId: string) => void;
}

const SWIPE_THRESHOLD = 88;

function CalcEntryCard({ entry, cost, onRemove }: CalcEntryCardProps) {
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
    if (hasSwiped.current || swipeX < 0) {
      setSwipeX(0);
      return;
    }
    setExpanded(e => !e);
  }

  return (
    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
      {/* Remove action */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: SWIPE_THRESHOLD,
          background: '#e53e3e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <button
          onClick={() => onRemove(entry.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            padding: '0 8px',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Delete
        </button>
      </div>

      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
        style={{
          background: '#ffffff',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14,
          overflow: 'hidden',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {/* Header row */}
        <div
          style={{
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,90,31,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d={meta?.svgPath ?? 'M3 12h18'}
                stroke="var(--color-orange)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Labels */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
                color: '#0a0a0a',
                letterSpacing: '-0.2px',
              }}
            >
              {meta?.label ?? entry.calculatorId}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 11, color: '#999' }}>
              {timeStr(entry.timestamp)}
            </p>
          </div>

          {/* Key result + cost */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
                color: '#0a0a0a',
                letterSpacing: '-0.3px',
              }}
            >
              {cost !== null ? formatCost(cost) : keyValue}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 10, color: '#999' }}>
              {cost !== null ? 'est. materials' : keyLabel}
            </p>
          </div>

          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ccc"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              transform: expanded ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Expanded inputs/outputs */}
        {expanded && (
          <div
            style={{
              borderTop: '0.5px solid rgba(0,0,0,0.06)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <MaterialsForCalc entry={entry} />
            <div>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Inputs
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.entries(entry.inputs).map(([key, val]) => (
                  <div
                    key={key}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                  >
                    <span style={{ color: '#999' }}>{cleanKey(key)}</span>
                    <span style={{ color: '#0a0a0a', fontWeight: 500 }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  margin: '0 0 6px',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                Results
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Object.entries(entry.outputs).map(([key, val]) => (
                  <div
                    key={key}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}
                  >
                    <span style={{ color: '#999' }}>{cleanKey(key)}</span>
                    <span style={{ color: '#0a0a0a', fontWeight: 500 }}>{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JobDetailPage ───────────────────────────────────────────────────────────

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob, getJobCalculations, removeCalculationFromJob } =
    useContext(JobsContext);
  const { settings } = useContext(SettingsContext);
  const { deleteEntry } = useContext(HistoryContext);

  const job = jobs.find(j => j.id === id);

  const [notes, setNotes] = useState(job?.notes ?? '');
  const [showMenu, setShowMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameDraft, setRenameDraft] = useState(job?.name ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (job) {
      setNotes(job.notes);
      setRenameDraft(job.name);
    }
  }, [job?.id]);

  useEffect(() => {
    if (showRename) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [showRename]);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (!job) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: 14,
        }}
      >
        Job not found
      </div>
    );
  }

  const calculations = getJobCalculations(job.id);

  const entryCosts = calculations.map(e => estimateEntryCost(e, settings.materialRates));
  const hasAnyRate = Object.values(settings.materialRates).some(v => v > 0);
  const totalCost = hasAnyRate
    ? entryCosts.reduce<number | null>((sum, c) => {
        if (c === null) return sum;
        return (sum ?? 0) + c;
      }, null)
    : null;

  function handleNotesBlur() {
    if (notes !== job!.notes) {
      updateJob(job!.id, { notes });
    }
  }

  function handleRename() {
    if (!renameDraft.trim() || renameDraft.trim() === job!.name) {
      setShowRename(false);
      return;
    }
    updateJob(job!.id, { name: renameDraft.trim() });
    setShowRename(false);
  }

  function handleDelete() {
    deleteJob(job!.id);
    navigate('/jobs', { replace: true });
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px 0',
          gap: 8,
          position: 'sticky',
          top: 0,
          background: 'var(--color-bg)',
          zIndex: 10,
        }}
      >
        {/* Back */}
        <button
          onClick={() => navigate('/jobs')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 8px 8px 0',
            cursor: 'pointer',
            color: 'var(--color-orange)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 15,
            fontFamily: 'inherit',
            flexShrink: 0,
            minWidth: 44,
            minHeight: 44,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Jobs
        </button>

        {/* Title — tap to rename */}
        <button
          onClick={() => { setRenameDraft(job.name); setShowRename(true); }}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            padding: '4px 0',
            minWidth: 0,
            minHeight: 44,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              color: '#0a0a0a',
              letterSpacing: '-0.4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {job.name}
          </p>
        </button>

        {/* Three-dot menu */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu(m => !m)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: '#999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                background: '#fff',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                minWidth: 160,
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => { setShowMenu(false); setRenameDraft(job.name); setShowRename(true); }}
                style={menuItemStyle}
              >
                Rename
              </button>
              <div style={{ height: 0.5, background: 'rgba(0,0,0,0.06)' }} />
              <button
                onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                style={{ ...menuItemStyle, color: '#e53e3e' }}
              >
                Delete job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div style={{ padding: '16px 20px 0' }}>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          placeholder="Add notes…  (address, client, phone)"
          rows={2}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 12,
            border: '0.5px solid rgba(0,0,0,0.08)',
            background: '#fff',
            fontSize: 14,
            fontFamily: 'inherit',
            color: '#0a0a0a',
            outline: 'none',
            resize: 'none',
            boxSizing: 'border-box',
            lineHeight: 1.5,
            WebkitAppearance: 'none',
          } as React.CSSProperties}
        />
      </div>

      {/* Cost total banner */}
      {calculations.length > 0 && (
        <div style={{ padding: '12px 20px 0' }}>
          <div
            style={{
              background: totalCost !== null ? 'rgba(255,90,31,0.06)' : 'rgba(0,0,0,0.03)',
              border: `0.5px solid ${totalCost !== null ? 'rgba(255,90,31,0.2)' : 'rgba(0,0,0,0.06)'}`,
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#999', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Est. materials cost
              </p>
              {totalCost !== null ? (
                <p style={{ margin: '3px 0 0', fontSize: 22, fontWeight: 600, color: '#FF5A1F', letterSpacing: '-0.5px' }}>
                  {formatCost(totalCost)}
                </p>
              ) : (
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#999' }}>
                  {hasAnyRate ? 'No priced items in this job' : 'Set rates in Settings'}
                </p>
              )}
            </div>
            {totalCost !== null && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 11, color: '#999' }}>
                  {entryCosts.filter(c => c !== null).length} of {calculations.length} items priced
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculations */}
      <div style={{ flex: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {calculations.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              textAlign: 'center',
              paddingBottom: 40,
            }}
          >
            <p style={{ margin: 0, fontSize: 14, color: '#999', lineHeight: 1.5 }}>
              No calculations in this job yet.{'\n'}Tap + to add one.
            </p>
          </div>
        ) : (
          calculations.map((entry, i) => (
            <CalcEntryCard
              key={entry.id}
              entry={entry}
              cost={entryCosts[i]}
              onRemove={calcId => {
                removeCalculationFromJob(job.id, calcId);
                deleteEntry(calcId);
              }}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <div
        style={{
          position: 'sticky',
          bottom: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          paddingRight: 20,
          paddingBottom: 4,
          pointerEvents: 'none',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => {
            sessionStorage.setItem('setout_pending_job', job.id);
            navigate('/');
          }}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#FF5A1F',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255,90,31,0.4)',
            pointerEvents: 'auto',
          }}
          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.93)')}
          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Rename sheet */}
      {showRename && (
        <>
          <div
            onClick={() => setShowRename(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 390,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.12)',
                alignSelf: 'center',
                marginBottom: 4,
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#0a0a0a', letterSpacing: '-0.4px' }}>
              Rename job
            </h2>
            <input
              ref={renameInputRef}
              type="text"
              value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '0.5px solid rgba(0,0,0,0.12)',
                background: 'var(--color-bg)',
                fontSize: 16,
                fontFamily: 'inherit',
                color: '#0a0a0a',
                outline: 'none',
                WebkitAppearance: 'none',
              }}
            />
            <button
              onClick={handleRename}
              disabled={!renameDraft.trim()}
              style={{
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: renameDraft.trim() ? '#FF5A1F' : 'rgba(0,0,0,0.08)',
                color: renameDraft.trim() ? '#fff' : '#999',
                fontSize: 16,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: renameDraft.trim() ? 'pointer' : 'default',
              }}
            >
              Save
            </button>
          </div>
        </>
      )}

      {/* Delete confirm sheet */}
      {showDeleteConfirm && (
        <>
          <div
            onClick={() => setShowDeleteConfirm(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 390,
              background: '#fff',
              borderRadius: '20px 20px 0 0',
              padding: '20px 20px 40px',
              zIndex: 201,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'rgba(0,0,0,0.12)',
                alignSelf: 'center',
                marginBottom: 4,
              }}
            />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#0a0a0a', letterSpacing: '-0.4px' }}>
              Delete "{job.name}"?
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: '#999', lineHeight: 1.5 }}>
              The job will be deleted. Your calculations stay in History.
            </p>
            <button
              onClick={handleDelete}
              style={{
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: '#e53e3e',
                color: '#fff',
                fontSize: 16,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Delete job
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '14px',
                borderRadius: 14,
                border: '0.5px solid rgba(0,0,0,0.08)',
                background: 'none',
                color: '#999',
                fontSize: 15,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '13px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#0a0a0a',
};
