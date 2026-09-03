import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryContext } from '../contexts';
import type { HistoryEntry } from '../types';

interface QuoteMaterial {
  item: string;
  quantity: number | null;
  unit: string;
}

function parseMaterials(json: string): QuoteMaterial[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function QuoteRow({ entry, onDelete }: { entry: HistoryEntry; onDelete: (id: string) => void }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const label = entry.jobName || 'Untitled quote';
  const canEdit = typeof entry.outputs.quoteStateJson === 'string';
  const dateStr = new Date(entry.timestamp).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: true });

  const areaM2 = Number(entry.outputs.areaM2) || 0;
  const labourHours = Number(entry.outputs.labourHours) || 0;
  const materialCount = Number(entry.outputs.materialCount) || 0;
  const materials = parseMaterials(String(entry.outputs.materialsJson ?? '[]'));

  const metaParts = [
    materialCount > 0 ? `${materialCount} material${materialCount !== 1 ? 's' : ''}` : '',
    areaM2 > 0 ? `${areaM2}m²` : '',
    labourHours > 0 ? `${labourHours} hrs labour` : '',
  ].filter(Boolean);

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
          width: '100%', background: 'none', border: 'none', padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontWeight: 500, fontSize: 14, color: 'var(--color-text)', letterSpacing: '-0.2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--color-muted)' }}>
            {dateStr} · {timeStr}{metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
          </p>
        </div>

        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--color-border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {materials.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Materials
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {materials.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--color-text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.item}</span>
                    <span style={{ color: 'var(--color-muted)', flexShrink: 0 }}>{m.quantity ?? '—'} {m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              onClick={() => confirmDelete ? onDelete(entry.id) : setConfirmDelete(true)}
              onBlur={() => setConfirmDelete(false)}
              style={{
                padding: '8px 14px', borderRadius: 10, border: 'none',
                background: confirmDelete ? '#fee2e2' : 'rgba(0,0,0,0.05)',
                color: confirmDelete ? '#e53e3e' : 'var(--color-muted)', fontSize: 13,
                fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {confirmDelete ? 'Sure?' : 'Delete'}
            </button>
            {canEdit && (
              <button
                onClick={() => navigate('/calc/photoquote', { state: { resumeEntryId: entry.id } })}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: 'none',
                  background: 'var(--color-orange)', color: '#fff', fontSize: 13,
                  fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function QuotesPage() {
  const { history, deleteEntry } = useContext(HistoryContext);
  const navigate = useNavigate();

  const quotes = history
    .filter(e => e.calculatorId === 'photoquote')
    .sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 'calc(env(safe-area-inset-top) + 20px) 20px 24px', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 500, color: 'var(--color-text)', letterSpacing: '-0.8px' }}>
          Quotes
        </h1>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate('/calc/photoquote', { state: { manual: true, docType: 'quote' } })}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '16px', borderRadius: 14, border: 'none',
            background: 'var(--color-orange)', color: '#fff', fontSize: 15, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.3px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New quote
        </button>
        <button
          onClick={() => navigate('/calc/photoquote', {
            state: { fromCalculator: true, scopeSummary: '', materials: [], docType: 'invoice' },
          })}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '16px', borderRadius: 14, border: '1.5px solid var(--color-orange)',
            background: 'none', color: 'var(--color-orange)', fontSize: 15, fontWeight: 500,
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '-0.3px',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New invoice
        </button>
      </div>

      {quotes.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, textAlign: 'center', paddingBottom: 60,
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, background: 'rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: 'var(--color-text)' }}>
            No quotes yet
          </p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)', maxWidth: 240, lineHeight: 1.5 }}>
            Start a new quote above, or tap "Add to Quote" from any calculator
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quotes.map(entry => (
            <QuoteRow key={entry.id} entry={entry} onDelete={deleteEntry} />
          ))}
        </div>
      )}
    </div>
  );
}
