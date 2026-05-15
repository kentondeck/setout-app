import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SavedJob, HistoryEntry } from '../types';
import { CALCULATORS } from '../lib/calculators';

interface JobCardProps {
  job: SavedJob;
  calculations: HistoryEntry[];
  onDelete: (id: string) => void;
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

export function JobCard({ job, calculations, onDelete }: JobCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const hasSwiped = useRef(false);

  const uniqueCalcIds = [...new Set(calculations.map(c => c.calculatorId))];

  function handleTouchStart(e: React.TouchEvent) {
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
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
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
      </div>
    </div>
  );
}
