import { useState, useContext, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobsContext, HistoryContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import type { HistoryEntry } from '../types';
import { DeckingDiagram } from '../components/DeckingDiagram';

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

  const rows = [
    { label: 'Decking boards', qty: boardCount, mm: deckWidthMm },
    { label: 'Joists', qty: joistCount, mm: deckLengthMm },
    { label: 'Bearers', qty: bearerCount, mm: deckWidthMm },
    { label: 'Fixings (approx)', qty: fixingsCount, mm: null as number | null },
  ];

  return (
    <>
      <div>
        <SectionLabel>Materials</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#999' }}>{row.label}</span>
              <span style={{ color: '#0a0a0a', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                {row.mm !== null ? `${fmt(row.qty)} × ${fmt(row.mm)}mm` : `${fmt(row.qty)} screws`}
              </span>
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

// ─── CalcEntryCard ───────────────────────────────────────────────────────────

interface CalcEntryCardProps {
  entry: HistoryEntry;
  onRemove: (calcId: string) => void;
}

const SWIPE_THRESHOLD = 88;

function CalcEntryCard({ entry, onRemove }: CalcEntryCardProps) {
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

          {/* Key result */}
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
              {keyValue}
            </p>
            <p style={{ margin: '1px 0 0', fontSize: 10, color: '#999' }}>{keyLabel}</p>
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
            {entry.calculatorId === 'decking' && <DeckingMaterials entry={entry} />}
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
          calculations.map(entry => (
            <CalcEntryCard
              key={entry.id}
              entry={entry}
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
