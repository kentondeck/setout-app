import { useContext, useState, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { SettingsContext, HistoryContext, JobsContext } from '../contexts';
import { CALCULATORS } from '../lib/calculators';

interface Props {
  onClose: () => void;
}

function statLabel(text: string) {
  return (
    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>
      {text}
    </div>
  );
}

export function ProfileSheet({ onClose }: Props) {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { history } = useContext(HistoryContext);
  const { jobs } = useContext(JobsContext);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.userName);
  const nameRef = useRef<HTMLInputElement>(null);

  function startEditingName() {
    // flushSync + immediate focus keeps this inside the click's trusted
    // gesture — a focus() reached via setTimeout instead opens the iOS
    // keyboard without binding it, so nothing typed ever registers.
    flushSync(() => { setNameInput(settings.userName); setEditingName(true); });
    nameRef.current?.focus();
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) updateSettings({ userName: trimmed });
    setEditingName(false);
  }

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonthCount = history.filter(e => {
      const d = new Date(e.timestamp);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    // top calculator
    const freq: Record<string, number> = {};
    for (const e of history) freq[e.calculatorId] = (freq[e.calculatorId] ?? 0) + 1;
    const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCalc = topId ? CALCULATORS.find(c => c.id === topId) : null;
    const topCount = topId ? freq[topId] : 0;

    // using since
    let usingSince = '';
    if (history.length > 0) {
      const oldest = Math.min(...history.map(e => e.timestamp));
      usingSince = new Date(oldest).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    }

    // most active month
    const monthFreq: Record<string, number> = {};
    for (const e of history) {
      const key = new Date(e.timestamp).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
      monthFreq[key] = (monthFreq[key] ?? 0) + 1;
    }
    const bestMonth = Object.entries(monthFreq).sort((a, b) => b[1] - a[1])[0];

    return { thisMonthCount, topCalc, topCount, usingSince, bestMonth };
  }, [history]);

  const initial = (settings.userName || 'U').trim().charAt(0).toUpperCase();

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
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
          padding: '20px 20px calc(env(safe-area-inset-bottom) + 20px)',
          zIndex: 201,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          overflowY: 'auto',
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
            marginBottom: 24,
            flexShrink: 0,
          }}
        />

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#fff',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.5px',
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={nameRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  placeholder="Your name"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-orange)',
                    background: '#fff',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    outline: 'none',
                    minWidth: 0,
                    WebkitAppearance: 'none',
                  }}
                />
                <button
                  onClick={saveName}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--color-orange)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {settings.userName || 'Your name'}
                </span>
                <button
                  onClick={startEditingName}
                  style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  aria-label="Edit name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-muted)',
                  letterSpacing: '0.3px',
                  background: 'var(--color-bg)',
                  border: '0.5px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '2px 7px',
                }}
              >
                Free plan
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 10 }}>
            Your activity
          </div>

          {/* Row 1: total calcs + active jobs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1 }}>
                {history.length}
              </div>
              {statLabel('Total calculations')}
            </div>
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1 }}>
                {jobs.length}
              </div>
              {statLabel('Active jobs')}
            </div>
          </div>

          {/* Row 2: this month + using since */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-1px', lineHeight: 1 }}>
                {stats.thisMonthCount}
              </div>
              {statLabel('This month')}
            </div>
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {stats.usingSince || '—'}
              </div>
              {statLabel('Using since')}
            </div>
          </div>

          {/* Row 3: top calculator (full width) */}
          {stats.topCalc && (
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
                  {stats.topCalc.label}
                </div>
                {statLabel('Most used calculator')}
              </div>
              <div
                style={{
                  background: 'rgba(255,90,31,0.08)',
                  color: 'var(--color-orange)',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '5px 10px',
                  flexShrink: 0,
                  letterSpacing: '-0.2px',
                }}
              >
                {stats.topCount}×
              </div>
            </div>
          )}

          {/* Best month */}
          {stats.bestMonth && stats.bestMonth[1] > 1 && (
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
                  {stats.bestMonth[0]}
                </div>
                {statLabel('Most active month')}
              </div>
              <div
                style={{
                  background: 'rgba(255,90,31,0.08)',
                  color: 'var(--color-orange)',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 8,
                  padding: '5px 10px',
                  flexShrink: 0,
                  letterSpacing: '-0.2px',
                }}
              >
                {stats.bestMonth[1]} calcs
              </div>
            </div>
          )}

          {/* Empty state */}
          {history.length === 0 && (
            <div style={{ background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                Run your first calculation to see stats here.
              </div>
            </div>
          )}
        </div>

        {/* Upgrade banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #863bff 0%, #5b21b6 100%)',
            borderRadius: 14,
            padding: '16px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.2px' }}>
              Setout Pro
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Unlimited jobs · PDF export · Priority support
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              color: '#863bff',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              padding: '7px 12px',
              flexShrink: 0,
              letterSpacing: '-0.1px',
            }}
          >
            Upgrade
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Setout v0.1.0 — built for builders</span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            padding: '14px',
            borderRadius: 14,
            border: '0.5px solid var(--color-border)',
            background: 'none',
            color: 'var(--color-muted)',
            fontSize: 15,
            fontFamily: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}
