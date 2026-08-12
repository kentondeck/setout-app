import { useState } from 'react';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const MUTED = '#999';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function risen(delay: string) {
  return `riseIn 650ms ${EASE} ${delay} both`;
}

interface Props {
  onComplete: () => void;
}

export function OnboardingEmail({ onComplete }: Props) {
  const [exiting, setExiting] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function finish() {
    localStorage.setItem('setout_email_done', 'true');
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  async function handleSignUp() {
    const trimmed = email.trim();
    if (!trimmed) { finish(); return; }

    setSubmitting(true);
    try {
      const name = localStorage.getItem('setout_user_name') ?? '';
      const region = localStorage.getItem('setout_region') ?? '';
      const role = localStorage.getItem('setout_role') ?? '';
      await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email: trimmed, region, role }),
      });
    } catch { /* best effort */ }
    setSubmitting(false);
    finish();
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9994 }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 28px',
        ...(exiting ? {
          opacity: 0,
          transform: 'translateY(-16px)',
          transition: 'opacity 240ms ease-in, transform 240ms ease-in',
        } : {}),
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

          <div style={{ animation: risen('0ms') }}>
            <span style={{ fontWeight: 500, letterSpacing: '-0.8px', fontSize: 28, lineHeight: 1, fontFamily: FONT }}>
              <span style={{ color: DARK }}>set</span>
              <span style={{ color: ORANGE }}>out</span>
            </span>
          </div>

          <div style={{ width: 24, height: 1.5, background: ORANGE, marginTop: 16, animation: risen('80ms') }} />

          <h1 style={{
            margin: '40px 0 0',
            fontFamily: FONT, fontSize: 36, fontWeight: 600,
            letterSpacing: '-1.2px', color: DARK,
            textAlign: 'center', lineHeight: 1.15,
            animation: risen('160ms'),
          }}>
            Stay in the<br />loop
          </h1>

          <p style={{
            margin: '20px 0 0',
            fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
            color: MUTED, textAlign: 'center', maxWidth: 280,
            animation: risen('240ms'),
          }}>
            Get updates on new features and tips. No spam, ever.
          </p>

          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignUp()}
            placeholder="your@email.com"
            autoComplete="email"
            style={{
              marginTop: 40, width: '100%', maxWidth: 320, height: 56,
              borderRadius: 16, background: '#fff',
              border: '1.5px solid rgba(0,0,0,0.08)',
              padding: '0 20px', fontSize: 17,
              fontFamily: FONT, color: DARK, outline: 'none',
              letterSpacing: '-0.3px', boxSizing: 'border-box',
              animation: risen('320ms'),
            }}
          />

          <button
            onClick={handleSignUp}
            disabled={submitting}
            style={{
              marginTop: 12, width: '100%', maxWidth: 320, height: 56,
              borderRadius: 16,
              background: ORANGE,
              border: 'none',
              color: '#fff',
              fontSize: 16, fontWeight: 500, fontFamily: FONT,
              cursor: submitting ? 'default' : 'pointer',
              letterSpacing: '-0.2px',
              opacity: submitting ? 0.7 : 1,
              transition: 'transform 180ms ease, opacity 180ms ease',
              animation: risen('380ms'),
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.opacity = '0.9'; }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          >
            {submitting ? 'Signing up…' : 'Sign up'}
          </button>

          <button
            onClick={finish}
            style={{
              marginTop: 12, width: '100%', maxWidth: 320, height: 48,
              borderRadius: 16, background: 'none', border: 'none',
              color: MUTED, fontSize: 15, fontFamily: FONT,
              cursor: 'pointer', letterSpacing: '-0.2px',
              animation: risen('440ms'),
            }}
          >
            Skip for now
          </button>

        </div>
      </div>
    </div>
  );
}
