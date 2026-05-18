import { useState, useContext, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobsContext, HistoryContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import type { HistoryEntry, CalculatorId } from '../types';
import { DeckingDiagram } from '../components/DeckingDiagram';

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
    codecheck: (
      <g>
        <path d="M30 50 L44 64 L70 36" stroke={o} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="50" cy="50" r="32" stroke={o} strokeWidth="5" fill="none"/>
      </g>
    ),
  };

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      {icons[id] ?? (
        <line x1="20" y1="50" x2="80" y2="50" stroke={o} strokeWidth="5" strokeLinecap="round"/>
      )}
    </svg>
  );
}

// ─── Materials block (decking) ────────────────────────────────────────────────

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
      <div>
        <SectionLabel>Materials</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Decking boards', val: `${fmt(boardCount)} × ${fmt(deckWidthMm)}mm` },
            { label: 'Joists', val: `${fmt(joistCount)} × ${fmt(deckLengthMm)}mm` },
            { label: 'Bearers', val: `${fmt(bearerCount)} × ${fmt(deckWidthMm)}mm` },
            { label: 'Fixings (approx)', val: `${fmt(fixingsCount)} screws` },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#999' }}>{row.label}</span>
              <span style={{ color: '#0a0a0a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{row.val}</span>
            </div>
          ))}
        </div>
      </div>
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
      {/* Delete action */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: SWIPE_THRESHOLD,
        background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <button
          onClick={() => onRemove(entry.id)}
          style={{
            background: 'none', border: 'none', color: '#fff',
            fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
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
          background: 'var(--color-card)',
          border: '0.5px solid var(--color-border)',
          borderRadius: 14,
          overflow: 'hidden',
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: 1,
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.025)',
        }}
      >
        {/* Header row */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'rgba(255,90,31,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <CalcIcon id={entry.calculatorId} size={24} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.2px' }}>
              {meta?.label ?? entry.calculatorId}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 11.5, color: 'var(--color-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {timeStr(entry.timestamp)}
            </p>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.4px', fontVariantNumeric: 'tabular-nums' }}>
              {keyValue}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--color-muted)' }}>{keyLabel}</p>
          </div>

          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        {/* Expanded inputs/outputs */}
        {expanded && (
          <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {entry.calculatorId === 'decking' && <DeckingMaterials entry={entry} />}
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
                {Object.entries(entry.outputs).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--color-muted)' }}>{cleanKey(key)}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{String(val)}</span>
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

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      margin: '8px 0',
      padding: '40px 20px',
      background: 'var(--color-card)',
      border: '0.5px dashed rgba(0,0,0,0.18)',
      borderRadius: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(255,90,31,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
        No calcs yet
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', maxWidth: 220, lineHeight: 1.5 }}>
        Tap + to run a calculation and add it to this job.
      </p>
      <button
        onClick={onAdd}
        style={{
          marginTop: 8, padding: '10px 20px',
          background: 'var(--color-orange)', color: '#fff',
          border: 'none', borderRadius: 999,
          fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
          letterSpacing: '-0.2px', cursor: 'pointer',
        }}
        onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
        onPointerUp={e => (e.currentTarget.style.opacity = '1')}
        onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        + Add calc
      </button>
    </div>
  );
}

// ─── JobDetailPage ────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  older: 'Older',
};

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { jobs, updateJob, deleteJob, getJobCalculations, removeCalculationFromJob } = useContext(JobsContext);
  const { deleteEntry } = useContext(HistoryContext);

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
    if (job) {
      setRenameDraft(job.name);
      setNotesDraft(job.notes);
    }
  }, [job?.id]);

  useEffect(() => {
    if (showRename) setTimeout(() => renameInputRef.current?.focus(), 50);
  }, [showRename]);

  useEffect(() => {
    if (showNotesSheet) setTimeout(() => notesRef.current?.focus(), 50);
  }, [showNotesSheet]);

  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  if (!job) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
        Job not found
      </div>
    );
  }

  const calculations = getJobCalculations(job.id);

  // Group by day
  const groupOrder: ('today' | 'yesterday' | 'older')[] = ['today', 'yesterday', 'older'];
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

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 18px 14px', gap: 10,
        position: 'sticky', top: 0, background: 'var(--color-bg)', zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/jobs')}
          style={{
            background: 'none', border: 'none', padding: '4px 6px 4px 0',
            cursor: 'pointer', color: 'var(--color-orange)',
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 15, fontWeight: 500, fontFamily: 'inherit',
            flexShrink: 0, minHeight: 44,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Jobs
        </button>

        <button
          onClick={() => { setRenameDraft(job.name); setShowRename(true); }}
          style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            textAlign: 'left', padding: '2px 0', minWidth: 0,
          }}
        >
          <p style={{
            margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--color-text)',
            letterSpacing: '-0.7px', lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.name}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--color-muted)', letterSpacing: '0.1px' }}>
            {calculations.length} {calculations.length === 1 ? 'calc' : 'calcs'} · last edit {relativeTime(job.updatedAt)}
          </p>
        </button>

        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMenu(m => !m)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px', color: 'var(--color-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 44, minHeight: 44,
            }}
          >
            <svg width="4" height="18" viewBox="0 0 4 18" fill="currentColor">
              <circle cx="2" cy="2" r="2"/><circle cx="2" cy="9" r="2"/><circle cx="2" cy="16" r="2"/>
            </svg>
          </button>

          {showMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '100%',
              background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
              borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              minWidth: 160, zIndex: 50, overflow: 'hidden',
            }}>
              <button onClick={() => { setShowMenu(false); setRenameDraft(job.name); setShowRename(true); }} style={menuItemStyle}>
                Rename
              </button>
              <div style={{ height: 0.5, background: 'rgba(0,0,0,0.06)' }} />
              <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} style={{ ...menuItemStyle, color: '#e53e3e' }}>
                Delete job
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Notes pill ── */}
      <div style={{ padding: '0 18px 16px' }}>
        <button
          onClick={() => { setNotesDraft(job.notes); setShowNotesSheet(true); }}
          style={{
            width: '100%', background: 'var(--color-card)',
            border: '0.5px solid var(--color-border)', borderRadius: 14,
            padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'text', boxShadow: '0 1px 2px rgba(0,0,0,0.025)',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M4 6h16M4 12h16M4 18h10" stroke="var(--color-muted)" strokeWidth="1.7" strokeLinecap="round"/>
          </svg>
          <span style={{
            fontSize: 13.5, letterSpacing: '-0.2px',
            color: job.notes ? 'var(--color-text)' : 'var(--color-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {job.notes || 'Add notes… (address, client, phone)'}
          </span>
        </button>
      </div>

      {/* ── Calc list ── */}
      <div style={{ flex: 1, padding: '0 18px 100px', display: 'flex', flexDirection: 'column' }}>
        {calculations.length === 0 ? (
          <EmptyState onAdd={handleAddCalc} />
        ) : (
          groupOrder.map(g => {
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
                      onRemove={calcId => {
                        removeCalculationFromJob(job.id, calcId);
                        deleteEntry(calcId);
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FAB ── */}
      <div style={{
        position: 'sticky', bottom: 16,
        display: 'flex', justifyContent: 'flex-end',
        paddingRight: 20, paddingBottom: 4,
        pointerEvents: 'none', flexShrink: 0,
      }}>
        <button
          onClick={handleAddCalc}
          aria-label="Add calc"
          style={{
            width: 54, height: 54, borderRadius: '50%',
            background: 'var(--color-orange)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(255,90,31,0.38)',
            pointerEvents: 'auto',
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

      {/* ── Notes sheet ── */}
      {showNotesSheet && (
        <>
          <div onClick={() => setShowNotesSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={sheetStyle}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Notes</h2>
            <textarea
              ref={notesRef}
              value={notesDraft}
              onChange={e => setNotesDraft(e.target.value)}
              placeholder="Address, client name, phone…"
              rows={4}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '0.5px solid rgba(0,0,0,0.12)', background: 'var(--color-bg)',
                fontSize: 15, fontFamily: 'inherit', color: 'var(--color-text)',
                outline: 'none', resize: 'none', boxSizing: 'border-box',
                lineHeight: 1.5, WebkitAppearance: 'none',
              } as React.CSSProperties}
            />
            <button onClick={handleSaveNotes} style={sheetPrimaryBtn}>Save notes</button>
          </div>
        </>
      )}

      {/* ── Rename sheet ── */}
      {showRename && (
        <>
          <div onClick={() => setShowRename(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={sheetStyle}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Rename job</h2>
            <input
              ref={renameInputRef}
              type="text"
              value={renameDraft}
              onChange={e => setRenameDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
              style={{
                padding: '14px 16px', borderRadius: 12,
                border: '0.5px solid rgba(0,0,0,0.12)', background: 'var(--color-bg)',
                fontSize: 16, fontFamily: 'inherit', color: 'var(--color-text)',
                outline: 'none', WebkitAppearance: 'none',
              }}
            />
            <button
              onClick={handleRename}
              disabled={!renameDraft.trim()}
              style={{
                ...sheetPrimaryBtn,
                background: renameDraft.trim() ? 'var(--color-orange)' : 'rgba(0,0,0,0.08)',
                color: renameDraft.trim() ? '#fff' : '#999',
                cursor: renameDraft.trim() ? 'pointer' : 'default',
              }}
            >
              Save
            </button>
          </div>
        </>
      )}

      {/* ── Delete confirm sheet ── */}
      {showDeleteConfirm && (
        <>
          <div onClick={() => setShowDeleteConfirm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />
          <div style={sheetStyle}>
            <div style={sheetHandleStyle} />
            <h2 style={sheetTitleStyle}>Delete "{job.name}"?</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              The job will be deleted. Your calculations stay in History.
            </p>
            <button onClick={handleDelete} style={{ ...sheetPrimaryBtn, background: '#e53e3e' }}>Delete job</button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '14px', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.08)',
                background: 'none', color: 'var(--color-muted)', fontSize: 15,
                fontFamily: 'inherit', cursor: 'pointer',
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

// ─── Shared sheet styles ──────────────────────────────────────────────────────

const sheetStyle: React.CSSProperties = {
  position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: 390,
  background: '#fff', borderRadius: '20px 20px 0 0',
  padding: '20px 20px 44px', zIndex: 201,
  display: 'flex', flexDirection: 'column', gap: 14,
};

const sheetHandleStyle: React.CSSProperties = {
  width: 36, height: 4, borderRadius: 2,
  background: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 4,
};

const sheetTitleStyle: React.CSSProperties = {
  margin: 0, fontSize: 18, fontWeight: 600,
  color: 'var(--color-text)', letterSpacing: '-0.4px',
};

const sheetPrimaryBtn: React.CSSProperties = {
  padding: '16px', borderRadius: 14, border: 'none',
  background: 'var(--color-orange)', color: '#fff',
  fontSize: 16, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
};

const menuItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', padding: '13px 16px',
  background: 'none', border: 'none', cursor: 'pointer',
  textAlign: 'left', fontSize: 14, fontFamily: 'inherit', color: '#0a0a0a',
};
