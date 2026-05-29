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

const REGIONS = [
  { code: 'AU', flag: '🇦🇺', name: 'Australia',   standard: 'NCC 2022'  },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', standard: 'NZBC 2022' },
] as const;

type RegionCode = typeof REGIONS[number]['code'];

interface Props {
  onComplete: () => void;
}

export function OnboardingRegion({ onComplete }: Props) {
  const [exiting, setExiting] = useState(false);
  const [selected, setSelected] = useState<RegionCode | null>(null);

  function handleContinue() {
    if (!selected) return;
    localStorage.setItem('setout_region', selected);
    // Write into settings so compliance notes use the correct region immediately
    try {
      const s = JSON.parse(localStorage.getItem('setout_settings') ?? '{}');
      localStorage.setItem('setout_settings', JSON.stringify({ ...s, region: selected }));
    } catch {}
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  return (
    // Outer div — background always covers, never fades
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9996 }}>

      {/* Inner — only the content exits */}
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
            Where are you<br />building?
          </h1>

          <p style={{
            margin: '20px 0 0',
            fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
            color: MUTED, textAlign: 'center', maxWidth: 260,
            animation: risen('240ms'),
          }}>
            We'll apply the right standards and codes.
          </p>

          {/* Region tiles */}
          <div style={{
            marginTop: 40, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: risen('340ms'),
          }}>
            {REGIONS.map(r => {
              const active = selected === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => setSelected(r.code)}
                  style={{
                    width: '100%', height: 72,
                    borderRadius: 18,
                    background: active ? 'rgba(255,90,31,0.06)' : '#fff',
                    border: `1.5px solid ${active ? ORANGE : 'rgba(0,0,0,0.08)'}`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '0 20px',
                    cursor: 'pointer',
                    transition: 'border-color 180ms ease, background 180ms ease',
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{r.flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: DARK, letterSpacing: '-0.4px' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{r.standard}</div>
                  </div>
                  {active && (
                    <div style={{
                      marginLeft: 'auto', width: 20, height: 20,
                      borderRadius: '50%', background: ORANGE,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Let's build */}
          <button
            onClick={handleContinue}
            style={{
              marginTop: 16, width: '100%', height: 56,
              borderRadius: 16,
              background: selected ? ORANGE : 'rgba(0,0,0,0.06)',
              border: 'none',
              color: selected ? '#fff' : 'rgba(0,0,0,0.25)',
              fontSize: 16, fontWeight: 500, fontFamily: FONT,
              cursor: selected ? 'pointer' : 'default',
              letterSpacing: '-0.2px',
              transition: 'background 200ms ease, color 200ms ease, transform 180ms ease, opacity 180ms ease',
              animation: risen('420ms'),
            }}
            onPointerDown={e => {
              if (!selected) return;
              e.currentTarget.style.transform = 'scale(0.97)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          >
            Let's build
          </button>

        </div>
      </div>
    </div>
  );
}
