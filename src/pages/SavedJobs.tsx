import { useState, useContext } from 'react';
import { HistoryContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';
import type { HistoryEntry } from '../types';

interface SavedJobRowProps {
  entry: HistoryEntry;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<HistoryEntry>) => void;
}

function SavedJobRow({ entry, onDelete, onUpdate }: SavedJobRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(entry.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);

  function handleSaveNotes() {
    onUpdate(entry.id, { notes: notes.trim() });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  const meta = CALCULATORS.find(c => c.id === entry.calculatorId);
  const timeStr = new Date(entry.timestamp).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
            background: 'rgba(255,90,31,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d={meta?.svgPath ?? 'M3 12h18'} stroke="var(--color-orange)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--color-text)',
              letterSpacing: '-0.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.jobName}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
            {meta?.label} · {timeStr}
          </p>
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
            Delete this job
          </button>
        </div>
      )}
    </div>
  );
}

export function SavedJobs() {
  const { history, deleteEntry, updateEntry } = useContext(HistoryContext);
  const saved = history.filter(e => e.jobName);

  if (saved.length === 0) {
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
        <div style={{ fontSize: 40 }}>📁</div>
        <p style={{ margin: 0, fontWeight: 500, fontSize: 18, color: 'var(--color-text)', letterSpacing: '-0.4px' }}>
          No saved jobs yet
        </p>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)', maxWidth: 240 }}>
          Run a calc and hit Save with a job name — it'll show up here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 20px 24px', gap: 16 }}>
      <h1 style={{ margin: 0, fontWeight: 500, fontSize: 28, letterSpacing: '-0.8px', color: 'var(--color-text)' }}>
        Saved Jobs
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {saved.map(entry => (
          <SavedJobRow key={entry.id} entry={entry} onDelete={deleteEntry} onUpdate={updateEntry} />
        ))}
      </div>
    </div>
  );
}
