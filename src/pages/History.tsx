import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryContext, JobsContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import { AddToJobSheet } from '../components/AddToJobSheet';
import { Toast } from '../components/Toast';
import type { HistoryEntry } from '../types';

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const groups: Map<string, HistoryEntry[]> = new Map();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const entry of entries) {
    const d = new Date(entry.timestamp);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(entry);
  }

  return Array.from(groups.entries()).map(([label, entries]) => ({ label, entries }));
}

interface HistoryRowProps {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<HistoryEntry>) => void;
}

function HistoryRow({ entry, onDelete, onUpdate }: HistoryRowProps) {
  const { jobs } = useContext(JobsContext);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function handleSaveNotes() {
    onUpdate(entry.id, { notes: notes.trim() });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }
  const meta = CALCULATORS.find(c => c.id === entry.calculatorId);
  const label = entry.jobName ?? meta?.label ?? entry.calculatorId;
  const linkedJob = entry.jobId ? jobs.find(j => j.id === entry.jobId) : null;
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-card)',
        border: '0.5px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d={meta?.svgPath ?? 'M3 12h18'} stroke="var(--color-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)' }}>
              {meta?.label} · {timeStr}
            </p>
            {linkedJob && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#FF5A1F',
                  background: 'rgba(255,90,31,0.1)',
                  borderRadius: 5,
                  padding: '1px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {linkedJob.name}
              </span>
            )}
          </div>
        </div>

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted)"
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
      </button>

      {expanded && (
        <div
          style={{
            borderTop: '0.5px solid var(--color-border)',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Inputs
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(entry.inputs).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>{key}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Results
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(entry.outputs).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--color-muted)' }}>{key}</span>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Notes
            </p>
            <textarea
              value={notes}
              onChange={e => { setNotes(e.target.value); setNotesSaved(false); }}
              placeholder="Add notes for this job…"
              rows={3}
              style={{
                width: '100%',
                padding: '11px 12px',
                borderRadius: 10,
                border: '0.5px solid rgba(0,0,0,0.12)',
                background: 'var(--color-bg)',
                fontSize: 14,
                fontFamily: 'inherit',
                color: 'var(--color-text)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                lineHeight: 1.5,
                WebkitAppearance: 'none',
              }}
            />
            <button
              onClick={handleSaveNotes}
              disabled={notesSaved}
              style={{
                alignSelf: 'flex-end',
                padding: '8px 18px',
                borderRadius: 10,
                border: 'none',
                background: notesSaved ? '#22c55e' : 'var(--color-orange)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'inherit',
                cursor: notesSaved ? 'default' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {notesSaved ? '✓ Saved' : 'Save notes'}
            </button>
          </div>

          {/* Add to job / View job */}
          {linkedJob ? (
            <button
              onClick={() => navigate(`/jobs/${linkedJob.id}`)}
              style={{
                background: 'none',
                border: '0.5px solid rgba(255,90,31,0.25)',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: '#FF5A1F',
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Saved to <strong style={{ fontWeight: 600 }}>{linkedJob.name}</strong></span>
              <span style={{ fontSize: 12, opacity: 0.7 }}>View job →</span>
            </button>
          ) : (
            <button
              onClick={() => setShowSheet(true)}
              style={{
                background: 'none',
                border: '0.5px solid rgba(255,90,31,0.25)',
                borderRadius: 10,
                padding: '10px',
                fontSize: 13,
                color: '#FF5A1F',
                fontFamily: 'inherit',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              + Add to job
            </button>
          )}

          <button
            onClick={() => onDelete(entry.id)}
            style={{
              background: 'none',
              border: '0.5px solid rgba(229,62,62,0.3)',
              borderRadius: 10,
              padding: '10px',
              fontSize: 13,
              color: '#e53e3e',
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Delete this entry
          </button>
        </div>
      )}

      {showSheet && (
        <AddToJobSheet
          calculationId={entry.id}
          onClose={() => setShowSheet(false)}
          onAdded={name => {
            setShowSheet(false);
            setToast(`Added to ${name}`);
          }}
        />
      )}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export function History() {
  const { history, deleteEntry, updateEntry, clearAll } = useContext(HistoryContext);
  const [confirmClear, setConfirmClear] = useState(false);

  if (history.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px 24px',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 40 }}>📋</div>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 18, color: 'var(--color-text)', letterSpacing: '-0.4px' }}>
          No calculations yet
        </p>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)', maxWidth: 240 }}>
          Your calculation history will appear here once you run a calc.
        </p>
      </div>
    );
  }

  const groups = groupByDate(history);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 20px 24px', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28, letterSpacing: '-0.8px', color: 'var(--color-text)' }}>
          History
        </h1>
        {confirmClear ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { clearAll(); setConfirmClear(false); }}
              style={{ fontSize: 13, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
            >
              Yes, clear all
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            style={{ fontSize: 13, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Clear all
          </button>
        )}
      </div>

      {groups.map(group => (
        <div key={group.label} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            {group.label}
          </p>
          {group.entries.map(entry => (
            <HistoryRow key={entry.id} entry={entry} onDelete={deleteEntry} onUpdate={updateEntry} />
          ))}
        </div>
      ))}
    </div>
  );
}
