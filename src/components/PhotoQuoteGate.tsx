import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPhotoQuoteToken } from '../lib/photoQuoteAccess';

interface Props {
  onUnlocked: () => void;
}

export function PhotoQuoteGate({ onUnlocked }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json() as { valid: boolean; token?: string };
      if (data.valid && data.token) {
        setPhotoQuoteToken(data.token);
        onUnlocked();
      } else {
        setError('Invalid access code.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-card)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', padding: 8, margin: -8,
            cursor: 'pointer', color: 'var(--color-orange)', borderRadius: 8,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)' }}>Smart Quote</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-card)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,90,31,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Early Access</p>
            <p style={{ fontSize: 14, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Smart Quote is currently invite-only. Enter your access code below to unlock it.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-card)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Access Code
            </label>
            <input
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="Enter your code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              style={{
                fontSize: 18, fontWeight: 600, letterSpacing: '0.08em',
                padding: '12px 14px',
                background: 'var(--color-bg)',
                border: `1.5px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
                borderRadius: 10,
                color: 'var(--color-text)',
                outline: 'none',
                width: '100%',
                fontFamily: 'inherit',
              }}
            />
            {error && (
              <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{
              background: loading || !code.trim() ? 'var(--color-border)' : 'var(--color-orange)',
              color: loading || !code.trim() ? 'var(--color-muted)' : '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Checking…' : 'Unlock Smart Quote'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--color-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Don't have a code?{' '}
          <a href="mailto:setouttheapp@gmail.com" style={{ color: 'var(--color-orange)', textDecoration: 'none' }}>
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
