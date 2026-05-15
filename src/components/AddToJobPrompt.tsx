import { useState, useContext, useEffect } from 'react';
import { HistoryContext, JobsContext } from '../contexts';
import { AddToJobSheet } from './AddToJobSheet';
import { Toast } from './Toast';

interface AddToJobPromptProps {
  calculationId: string;
}

export function AddToJobPrompt({ calculationId }: AddToJobPromptProps) {
  const { history } = useContext(HistoryContext);
  const { jobs } = useContext(JobsContext);
  const [skipped, setSkipped] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Reset when a new calculation is run
  useEffect(() => {
    setSkipped(false);
    setShowSheet(false);
  }, [calculationId]);

  if (!calculationId) return null;

  const entry = history.find(h => h.id === calculationId);
  if (!entry) return null;

  const linkedJob = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;

  // Read pending job from sessionStorage (set by JobDetailPage FAB)
  const pendingJobId = sessionStorage.getItem('setout_pending_job') ?? undefined;
  const pendingJob = pendingJobId ? jobs.find(j => j.id === pendingJobId) : undefined;

  // Already linked — show confirmation
  if (linkedJob) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 0',
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span style={{ fontSize: 13, color: '#999' }}>
          Saved to{' '}
          <span style={{ fontWeight: 500, color: '#0a0a0a' }}>{linkedJob.name}</span>
        </span>
      </div>
    );
  }

  if (skipped) return null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 0',
        }}
      >
        <span style={{ fontSize: 13, color: '#999', flex: 1 }}>
          {pendingJob ? `Add to "${pendingJob.name}"?` : 'Add to a job?'}
        </span>
        <button
          onClick={() => {
            setSkipped(true);
            sessionStorage.removeItem('setout_pending_job');
          }}
          style={{
            background: 'none',
            border: '0.5px solid rgba(0,0,0,0.1)',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 12,
            fontFamily: 'inherit',
            color: '#999',
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
        <button
          onClick={() => setShowSheet(true)}
          style={{
            background: '#FF5A1F',
            border: 'none',
            borderRadius: 8,
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'inherit',
            color: '#fff',
            cursor: 'pointer',
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Add to job
        </button>
      </div>

      {showSheet && (
        <AddToJobSheet
          calculationId={calculationId}
          preselectedJobId={pendingJobId}
          onClose={() => setShowSheet(false)}
          onAdded={name => {
            setShowSheet(false);
            setToast(`Added to ${name}`);
            sessionStorage.removeItem('setout_pending_job');
          }}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
