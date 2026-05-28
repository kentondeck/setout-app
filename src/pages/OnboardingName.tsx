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

export function OnboardingName({ onComplete }: Props) {
  const [exiting, setExiting] = useState(false);
  const [name, setName] = useState('');

  function handleContinue() {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem('setout_user_name', trimmed);
    // Write into settings so the greeting is correct on first app render
    try {
      const s = JSON.parse(localStorage.getItem('setout_settings') ?? '{}');
      localStorage.setItem('setout_settings', JSON.stringify({ ...s, userName: trimmed }));
    } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  const valid = name.trim().length > 0;

  return (
    // Outer div — background always covers, never fades
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9997 }}>

      {/* Inner — only the content exits */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '18% 32px 0',
        ...(exiting ? {
          opacity: 0,
          transform: 'translateY(-16px)',
          transition: 'opacity 240ms ease-in, transform 240ms ease-in',
        } : {}),
      }}>

        <div style={{ animation: risen('0ms') }}>
          <span style={{ fontWeight: 500, letterSpacing: '-0.8px', fontSize: 28, lineHeight: 1, fontFamily: FONT }}>
            <span style={{ color: DARK }}>set</span>
            <span style={{ color: ORANGE }}>out</span>
          </span>
        </div>

        <div style={{
          width: 24, height: 1.5, background: ORANGE, marginTop: 16,
          animation: risen('80ms'),
        }} />

        <h1 style={{
          margin: '40px 0 0',
          fontFamily: FONT, fontSize: 36, fontWeight: 600,
          letterSpacing: '-1.2px', color: DARK,
          textAlign: 'center', lineHeight: 1.15,
          animation: risen('160ms'),
        }}>
          What's your<br />name?
        </h1>

        <p style={{
          margin: '20px 0 0',
          fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
          color: MUTED, textAlign: 'center', maxWidth: 260,
          animation: risen('240ms'),
        }}>
          We'll use it across the app.
        </p>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleContinue()}
          placeholder="Your first name"
          autoComplete="given-name"
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
          onClick={handleContinue}
          style={{
            marginTop: 12, width: '100%', maxWidth: 320, height: 56,
            borderRadius: 16,
            background: valid ? ORANGE : 'rgba(0,0,0,0.06)',
            border: 'none',
            color: valid ? '#fff' : 'rgba(0,0,0,0.25)',
            fontSize: 16, fontWeight: 500, fontFamily: FONT,
            cursor: valid ? 'pointer' : 'default',
            letterSpacing: '-0.2px',
            transition: 'background 200ms ease, color 200ms ease, transform 180ms ease, opacity 180ms ease',
            animation: risen('380ms'),
          }}
          onPointerDown={e => {
            if (!valid) return;
            e.currentTarget.style.transform = 'scale(0.97)';
            e.currentTarget.style.opacity = '0.9';
          }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
        >
          Continue
        </button>

      </div>
    </div>
  );
}
