import { useNavigate } from 'react-router-dom';
import type { HistoryEntry } from '../types';
import { CALCULATORS } from '../lib/calculators';

interface ContinueCardProps {
  entry: HistoryEntry;
}

export function ContinueCard({ entry }: ContinueCardProps) {
  const navigate = useNavigate();
  const meta = CALCULATORS.find(c => c.id === entry.calculatorId);
  if (!meta) return null;

  const label = entry.jobName ?? meta.label;

  return (
    <button
      onClick={() => navigate(`/calc/${entry.calculatorId}`)}
      style={{
        background: '#ffffff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 16,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
      onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--color-orange)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d={meta.svgPath} stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontWeight: 500,
            fontSize: 14,
            color: 'var(--color-text)',
            letterSpacing: '-0.2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
          Pick up where you left off
        </p>
      </div>

      <span style={{ color: 'var(--color-muted)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>›</span>
    </button>
  );
}
