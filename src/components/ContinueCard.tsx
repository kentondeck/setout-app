import { useNavigate } from 'react-router-dom';
import type { HistoryEntry, SavedJob } from '../types';
import { CALCULATORS } from '../lib/calculators';

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

const cardStyle: React.CSSProperties = {
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
};

const iconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: 'var(--color-orange)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

interface ContinueCardProps {
  entry?: HistoryEntry;
  job?: SavedJob;
  lastCalcEntry?: HistoryEntry;
}

export function ContinueCard({ entry, job, lastCalcEntry }: ContinueCardProps) {
  const navigate = useNavigate();

  if (job) {
    const meta = lastCalcEntry
      ? CALCULATORS.find(c => c.id === lastCalcEntry.calculatorId)
      : null;
    const subtitle = meta
      ? `${meta.label} · ${formatRelativeTime(job.updatedAt)}`
      : formatRelativeTime(job.updatedAt);

    return (
      <button
        onClick={() => navigate(`/jobs/${job.id}`)}
        style={cardStyle}
        onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
        onPointerUp={e => (e.currentTarget.style.opacity = '1')}
        onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <div style={iconStyle}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
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
            {job.name}
          </p>
          <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
            {subtitle}
          </p>
        </div>

        <span style={{ color: 'var(--color-muted)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
          ›
        </span>
      </button>
    );
  }

  if (entry) {
    const meta = CALCULATORS.find(c => c.id === entry.calculatorId);
    if (!meta) return null;
    const label = entry.jobName ?? meta.label;

    return (
      <button
        onClick={() => navigate(`/calc/${entry.calculatorId}`)}
        style={cardStyle}
        onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
        onPointerUp={e => (e.currentTarget.style.opacity = '1')}
        onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <div style={iconStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d={meta.svgPath}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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

        <span style={{ color: 'var(--color-muted)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
          ›
        </span>
      </button>
    );
  }

  return null;
}
