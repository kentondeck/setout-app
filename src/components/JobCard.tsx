import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SavedJob, HistoryEntry } from '../types';
import { CALCULATORS } from '../lib/calculators';

interface JobCardProps {
  job: SavedJob;
  calculations: HistoryEntry[];
  onDelete: (id: string) => void;
  isEditing?: boolean;
  onRename?: (id: string, name: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

const SWIPE_THRESHOLD = 80;

export function JobCard({ job, calculations, onDelete, isEditing = false, onRename }: JobCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const hasSwiped = useRef(false);
  const [draftName, setDraftName] = useState(job.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraftName(job.name);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, job.name]);

  function handleRenameCommit() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== job.name) {
      onRename?.(job.id, trimmed);
    } else {
      setDraftName(job.name);
    }
  }

  const uniqueCalcIds = [...new Set(calculations.map(c => c.calculatorId))];

  function handleTouchStart(e: React.TouchEvent) {
    if (isEditing) return;
    touchStartX.current = e.touches[0].clientX;
    hasSwiped.current = false;
    setIsSwiping(true);
    setConfirmDelete(false);
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
    if (isEditing) return;
    if (hasSwiped.current) {
      setSwipeX(0);
      return;
    }
    if (swipeX < 0) {
      setSwipeX(0);
      return;
    }
    navigate(`/jobs/${job.id}`);
  }

  function handleDelete() {
    if (confirmDelete) {
      onDelete(job.id);
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}>
      {/* Delete action behind card */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: SWIPE_THRESHOLD,
          background: '#e53e3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Fully transparent at rest, in sync with the card's own slide
          // transition — otherwise the card's antialiased rounded-corner edge
          // blends against solid red sitting directly behind it, leaving a
          // hairline red tint at the corner even though the two elements'
          // bounds match exactly.
          opacity: swipeX < 0 ? 1 : 0,
          transition: isSwiping ? 'none' : 'opacity 0.2s ease',
        }}
      >
        <button
          onClick={handleDelete}
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
            lineHeight: 1.3,
          }}
        >
          {confirmDelete ? 'Sure?' : 'Delete'}
        </button>
      </div>

      {/* Card */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          background: '#ffffff',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 16,
          padding: '14px 16px',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
          // Omit the transform entirely at rest (rather than translateX(0px)) —
          // a zero-value transform still promotes the card to its own
          // compositing layer, and its anti-aliased rounded corners don't
          // perfectly align with the parent's overflow:hidden clip, leaking a
          // hairline of the red delete background through at the edges.
          ...(swipeX !== 0 ? { transform: `translateX(${swipeX}px)` } : {}),
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {isEditing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onBlur={handleRenameCommit}
              onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: '#0a0a0a',
                letterSpacing: '-0.3px',
                border: 'none',
                borderBottom: '1.5px solid #FF5A1F',
                borderRadius: 0,
                background: 'transparent',
                outline: 'none',
                padding: '0 0 2px',
                fontFamily: 'inherit',
                width: '100%',
                WebkitAppearance: 'none',
              }}
            />
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
                color: '#0a0a0a',
                letterSpacing: '-0.3px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {job.name}
            </p>
          )}
          <p style={{ margin: 0, fontSize: 12, color: '#999' }}>
            {calculations.length} {calculations.length === 1 ? 'calculation' : 'calculations'} · {formatRelativeTime(job.updatedAt)}
          </p>
          {uniqueCalcIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
              {uniqueCalcIds.map(id => {
                const meta = CALCULATORS.find(c => c.id === id);
                return (
                  <span
                    key={id}
                    style={{
                      fontSize: 11,
                      color: '#666',
                      background: 'rgba(0,0,0,0.06)',
                      borderRadius: 6,
                      padding: '2px 7px',
                      fontWeight: 500,
                    }}
                  >
                    {meta?.label ?? id}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        {isEditing ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF5A1F"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#999"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </div>
    </div>
  );
}
