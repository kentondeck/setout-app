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

export function BetaThankYou({ onComplete }: Props) {
  const [exiting, setExiting] = useState(false);

  function handleContinue() {
    localStorage.setItem('setout_thankyou_seen', 'true');
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  return (
    // Outer div — background always covers, never fades
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9998 }}>

      {/* Inner — only the content exits */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 32px',
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
            Thanks for<br />being here.
          </h1>

          <p style={{
            margin: '20px 0 0',
            fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
            color: MUTED, textAlign: 'center', maxWidth: 260,
            animation: risen('260ms'),
          }}>
            You're one of the first chippies to use setout. Your feedback means everything to us.
          </p>

          <button
            onClick={handleContinue}
            style={{
              marginTop: 56, width: '100%', maxWidth: 320, height: 56,
              borderRadius: 16, background: ORANGE, border: 'none',
              color: '#fff', fontSize: 16, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer', letterSpacing: '-0.2px',
              transition: 'transform 180ms ease, opacity 180ms ease',
              animation: risen('380ms'),
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.opacity = '0.9'; }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          >
            Let's go
          </button>

        </div>
      </div>
    </div>
  );
}
