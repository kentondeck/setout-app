import { useState, useContext, useRef, useEffect } from 'react';
import { JobsContext } from '../contexts';
import { JobCard } from '../components/JobCard';

export function JobsPage() {
  const { jobs, createJob, deleteJob, getJobCalculations } = useContext(JobsContext);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewJob) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showNewJob]);

  function handleCreate() {
    if (!newJobName.trim()) return;
    createJob(newJobName.trim());
    setNewJobName('');
    setShowNewJob(false);
  }

  function handleDismiss() {
    setShowNewJob(false);
    setNewJobName('');
  }

  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 20px 24px', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 500,
            color: '#0a0a0a',
            letterSpacing: '-0.5px',
          }}
        >
          Saved jobs
        </h1>
        <button
          onClick={() => setShowNewJob(true)}
          style={{
            background: '#FF5A1F',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            minHeight: 36,
          }}
          onPointerDown={e => (e.currentTarget.style.opacity = '0.85')}
          onPointerUp={e => (e.currentTarget.style.opacity = '1')}
          onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          + New job
        </button>
      </div>

      {/* Empty state */}
      {jobs.length === 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            textAlign: 'center',
            paddingBottom: 60,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ccc"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: '#0a0a0a' }}>
            No saved jobs yet
          </p>
          <p style={{ margin: 0, fontSize: 14, color: '#999', maxWidth: 240, lineHeight: 1.5 }}>
            Run a calculation and tap 'Add to job' to get started
          </p>
        </div>
      )}

      {/* Job list */}
      {jobs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sortedJobs.map(job => (
            <JobCard
              key={job.id}
              job={job}
              calculations={getJobCalculations(job.id)}
              onDelete={deleteJob}
            />
          ))}
        </div>
      )}

      {/* New job sheet */}
      {showNewJob && (
        <>
          <div
            onClick={handleDismiss}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 200,
            }}
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
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 500,
                color: '#0a0a0a',
                letterSpacing: '-0.4px',
              }}
            >
              New job
            </h2>
            <input
              ref={inputRef}
              type="text"
              value={newJobName}
              onChange={e => setNewJobName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="e.g. Smith deck reno"
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
              onClick={handleCreate}
              disabled={!newJobName.trim()}
              style={{
                padding: '16px',
                borderRadius: 14,
                border: 'none',
                background: newJobName.trim() ? '#FF5A1F' : 'rgba(0,0,0,0.08)',
                color: newJobName.trim() ? '#fff' : '#999',
                fontSize: 16,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: newJobName.trim() ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
              onPointerDown={e => { if (newJobName.trim()) e.currentTarget.style.opacity = '0.85'; }}
              onPointerUp={e => (e.currentTarget.style.opacity = '1')}
              onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Create job
            </button>
          </div>
        </>
      )}
    </div>
  );
}
