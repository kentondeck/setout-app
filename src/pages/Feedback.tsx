import { useContext, useState } from 'react';
import { CalcHeader } from '../components/CalcHeader';
import { SettingsContext } from '../contexts';

const FORMSPREE_ID = 'mykvovog';

export function Feedback() {
  const { settings } = useContext(SettingsContext);
  const userName = (settings.userName || localStorage.getItem('setout_user_name') || '').trim();

  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit() {
    if (!message.trim()) return;
    setStatus('submitting');
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message: message.trim(), name: userName || 'Anonymous' }),
      });
      if (res.ok) {
        setStatus('success');
        setMessage('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--color-card)',
    border: '0.5px solid var(--color-border)',
    borderRadius: 'var(--radius-card)',
    padding: '18px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--color-muted)',
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <CalcHeader title="Feedback" />

      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Beta banner */}
        <div
          style={{
            background: 'rgba(255,90,31,0.07)',
            border: '0.5px solid rgba(255,90,31,0.25)',
            borderRadius: 10,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.8px',
              color: 'var(--color-orange)',
              background: 'rgba(255,90,31,0.12)',
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
            }}
          >
            BETA
          </span>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.4 }}>
            Help shape the app — report bugs, suggest features, or tell us what's working.
          </p>
        </div>

        {/* Input card */}
        <div style={cardStyle}>
          <div>
            <p style={labelStyle}>Your feedback</p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={6}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'var(--color-bg)',
                border: '0.5px solid var(--color-border)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 15,
                fontFamily: 'inherit',
                color: 'var(--color-text)',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
          </div>

          {userName && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
              Sending as <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{userName}</span>
            </p>
          )}
        </div>

        {/* Submit */}
        {status !== 'success' && (
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || status === 'submitting'}
            style={{
              width: '100%',
              padding: '15px 0',
              borderRadius: 12,
              border: 'none',
              background: message.trim() ? 'var(--color-orange)' : 'var(--color-border)',
              color: message.trim() ? '#fff' : 'var(--color-muted)',
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: message.trim() ? 'pointer' : 'default',
              letterSpacing: '-0.2px',
            }}
          >
            {status === 'submitting' ? 'Sending…' : 'Send Feedback'}
          </button>
        )}

        {status === 'success' && (
          <div
            style={{
              background: 'var(--color-card)',
              border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius-card)',
              padding: '20px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 500, color: 'var(--color-text)' }}>
              Thanks for the feedback
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-muted)' }}>
              We read every submission.
            </p>
            <button
              onClick={() => setStatus('idle')}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                borderRadius: 10,
                border: '0.5px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Send another
            </button>
          </div>
        )}

        {status === 'error' && (
          <p style={{ margin: 0, fontSize: 13, color: '#e53e3e', textAlign: 'center' }}>
            Something went wrong. Check your connection and try again.
          </p>
        )}
      </div>
    </div>
  );
}
