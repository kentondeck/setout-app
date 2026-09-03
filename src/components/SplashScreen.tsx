import { useEffect, useState } from 'react';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 2000);
    const t2 = setTimeout(() => onComplete(), 2550);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'scale(1.04)' : 'scale(1)',
        transition: exiting ? 'opacity 550ms cubic-bezier(0.4, 0, 1, 1), transform 550ms cubic-bezier(0.4, 0, 1, 1)' : 'none',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', lineHeight: 1 }}>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: DARK,
              fontFamily: FONT,
              letterSpacing: '-3px',
              animation: 'splashLeft 650ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both',
            }}
          >
            set
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: ORANGE,
              fontFamily: FONT,
              letterSpacing: '-3px',
              animation: 'splashRight 650ms cubic-bezier(0.16, 1, 0.3, 1) 420ms both',
            }}
          >
            out
          </span>
        </div>

        <span
          style={{
            fontSize: 15,
            fontWeight: 400,
            color: DARK,
            fontFamily: FONT,
            letterSpacing: '-0.2px',
            animation: 'splashSubtitle 550ms ease-out 820ms both',
          }}
        >
          build better.
        </span>
      </div>
    </div>
  );
}
