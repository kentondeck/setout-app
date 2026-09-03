import { useState, useContext, useRef } from 'react';
import { flushSync } from 'react-dom';
import { JobsContext, KeyboardContext } from '../contexts';
import type { SavedJob } from '../types';

interface AddToJobSheetProps {
  calculationId: string;
  /** If set, that job is shown at the top and highlighted — used when coming from a job's FAB */
  preselectedJobId?: string;
  onClose: () => void;
  onAdded: (jobName: string) => void;
}

export function AddToJobSheet({
  calculationId,
  preselectedJobId,
  onClose,
  onAdded,
}: AddToJobSheetProps) {
  const { jobs, createJob, addCalculationToJob } = useContext(JobsContext);
  const { inset: keyboardInset } = useContext(KeyboardContext);
  const [showNewJob, setShowNewJob] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const newJobInputRef = useRef<HTMLInputElement>(null);

  function handleShowNewJob() {
    // flushSync mounts the input synchronously so the focus() call below stays
    // inside this click's event-handler stack — on iOS WKWebView, a focus()
    // reached via a later setTimeout/microtask loses the "trusted user
    // gesture" the keyboard needs, and it opens without ever accepting input.
    flushSync(() => setShowNewJob(true));
    newJobInputRef.current?.focus();
  }

  function handleSelectJob(job: SavedJob) {
    addCalculationToJob(job.id, calculationId);
    onAdded(job.name);
    onClose();
  }

  function handleCreateAndAdd() {
    if (!newJobName.trim()) return;
    const job = createJob(newJobName.trim());
    // addCalculationToJob batches after createJob via React's functional setState queue
    addCalculationToJob(job.id, calculationId);
    onAdded(newJobName.trim());
    onClose();
  }

  // Pre-selected job goes first; rest sorted by updatedAt desc
  const preselected = preselectedJobId ? jobs.find(j => j.id === preselectedJobId) : null;
  const rest = jobs
    .filter(j => j.id !== preselectedJobId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const orderedJobs = preselected ? [preselected, ...rest] : rest;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 200,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: keyboardInset,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 390,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: `20px 20px ${keyboardInset > 0 ? '20px' : 'calc(env(safe-area-inset-bottom) + 20px)'}`,
          zIndex: 201,
          maxHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          transition: 'bottom 0.2s ease',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,0,0,0.12)',
            alignSelf: 'center',
            marginBottom: 18,
          }}
        />

        <h2
          style={{
            margin: '0 0 14px',
            fontSize: 18,
            fontWeight: 500,
            color: '#0a0a0a',
            letterSpacing: '-0.4px',
          }}
        >
          Add to job
        </h2>

        {/* Scrollable job list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingBottom: 4,
          }}
        >
          {orderedJobs.length === 0 && !showNewJob && (
            <p style={{ fontSize: 14, color: '#999', margin: '4px 0 8px' }}>
              No jobs yet — create one below.
            </p>
          )}

          {orderedJobs.map(job => {
            const isPreselected = job.id === preselectedJobId;
            return (
              <button
                key={job.id}
                onClick={() => handleSelectJob(job)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '13px 16px',
                  background: isPreselected ? 'rgba(255,90,31,0.06)' : 'var(--color-bg)',
                  border: isPreselected
                    ? '0.5px solid rgba(255,90,31,0.35)'
                    : '0.5px solid rgba(0,0,0,0.06)',
                  borderRadius: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  gap: 12,
                  fontFamily: 'inherit',
                }}
                onPointerDown={e => (e.currentTarget.style.opacity = '0.8')}
                onPointerUp={e => (e.currentTarget.style.opacity = '1')}
                onPointerLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {/* Folder icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isPreselected ? 'rgba(255,90,31,0.1)' : 'rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isPreselected ? '#FF5A1F' : '#999'}
                    strokeWidth="2"
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
                      fontSize: 15,
                      fontWeight: 500,
                      color: isPreselected ? '#FF5A1F' : '#0a0a0a',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {job.name}
                    {isPreselected && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 400,
                          color: '#FF5A1F',
                          opacity: 0.7,
                        }}
                      >
                        current job
                      </span>
                    )}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#999' }}>
                    {job.calculationIds.length}{' '}
                    {job.calculationIds.length === 1 ? 'calculation' : 'calculations'}
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
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}

          {/* New job row */}
          {showNewJob ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
              <input
                ref={newJobInputRef}
                type="text"
                value={newJobName}
                onChange={e => setNewJobName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAdd(); }}
                placeholder="e.g. Johnson extension"
                style={{
                  padding: '13px 14px',
                  borderRadius: 12,
                  border: '0.5px solid rgba(0,0,0,0.12)',
                  background: 'var(--color-bg)',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  color: '#0a0a0a',
                  outline: 'none',
                  WebkitAppearance: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setShowNewJob(false); setNewJobName(''); }}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: 12,
                    border: '0.5px solid rgba(0,0,0,0.08)',
                    background: 'none',
                    color: '#999',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newJobName.trim()}
                  style={{
                    flex: 2,
                    padding: '13px',
                    borderRadius: 12,
                    border: 'none',
                    background: newJobName.trim() ? '#FF5A1F' : 'rgba(0,0,0,0.08)',
                    color: newJobName.trim() ? '#fff' : '#999',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: newJobName.trim() ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                >
                  Create & add
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleShowNewJob}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '13px 16px',
                background: 'none',
                border: '0.5px dashed rgba(0,0,0,0.15)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                color: '#FF5A1F',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New job
            </button>
          )}
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: '14px',
            borderRadius: 14,
            border: '0.5px solid rgba(0,0,0,0.08)',
            background: 'none',
            color: '#999',
            fontSize: 15,
            fontFamily: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}
