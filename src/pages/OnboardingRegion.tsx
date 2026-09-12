import { useState } from 'react';
import type { Settings } from '../types';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const MUTED = '#8a8a8a';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";
const DISPLAY = "'Big Shoulders Display', sans-serif";
const MONO = "'JetBrains Mono', monospace";
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function risen(delay: string) {
  return `riseIn 650ms ${EASE} ${delay} both`;
}

const gridBackground: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(rgba(10,10,10,0.045) 1px, transparent 1px), ' +
    'linear-gradient(90deg, rgba(10,10,10,0.045) 1px, transparent 1px)',
  backgroundSize: '26px 26px',
};

function StepBadge({ step, label }: { step: 1 | 2 | 3; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 320, animation: risen('120ms') }}>
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: ORANGE }}>
        0{step}/03
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.1)', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${(step / 3) * 100}%`, background: ORANGE }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  );
}

const REGIONS = [
  { code: 'AU', flag: '🇦🇺', name: 'Australia',   standard: 'NCC 2022'  },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', standard: 'NZBC 2022' },
] as const;

type RegionCode = typeof REGIONS[number]['code'];

interface Props {
  onComplete: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export function OnboardingRegion({ onComplete, updateSettings }: Props) {
  const [exiting, setExiting] = useState(false);
  const [selected, setSelected] = useState<RegionCode | null>(null);

  function handleContinue() {
    if (!selected) return;
    localStorage.setItem('setout_region', selected);
    updateSettings({ region: selected });
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  return (
    // Outer div — background always covers, never fades
    <div style={{ position: 'absolute', inset: 0, background: BG, ...gridBackground, zIndex: 9996 }}>

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
            <span style={{ fontWeight: 500, letterSpacing: '-0.8px', fontSize: 26, lineHeight: 1, fontFamily: FONT }}>
              <span style={{ color: DARK }}>set</span>
              <span style={{ color: ORANGE }}>out</span>
            </span>
          </div>

          <svg width="56" height="10" viewBox="0 0 56 10" style={{ marginTop: 14, animation: risen('60ms') }}>
            <line x1="1" y1="5" x2="55" y2="5" stroke={ORANGE} strokeWidth="1.5" />
          </svg>

          <div style={{ marginTop: 40 }}>
            <StepBadge step={2} label="Region" />
          </div>

          <h1 style={{
            margin: '22px 0 0',
            fontFamily: DISPLAY, fontSize: 44, fontWeight: 800,
            letterSpacing: '-0.5px', color: DARK, textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 0.95,
            animation: risen('160ms'),
          }}>
            Where are you<br />building?
          </h1>

          <p style={{
            margin: '16px 0 0',
            fontFamily: FONT, fontSize: 15, lineHeight: 1.6,
            color: MUTED, textAlign: 'center', maxWidth: 260,
            animation: risen('220ms'),
          }}>
            We'll apply the right standards and codes.
          </p>

          {/* Region tiles */}
          <div style={{
            marginTop: 36, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 10,
            animation: risen('300ms'),
          }}>
            {REGIONS.map(r => {
              const active = selected === r.code;
              return (
                <button
                  key={r.code}
                  onClick={() => setSelected(r.code)}
                  style={{
                    position: 'relative',
                    width: '100%', height: 68,
                    borderRadius: 6,
                    background: active ? ORANGE : '#fff',
                    border: `1px solid ${active ? ORANGE : 'rgba(0,0,0,0.1)'}`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '0 20px',
                    cursor: 'pointer',
                    transition: 'border-color 180ms ease, background 180ms ease',
                    fontFamily: FONT,
                  }}
                >
                  {active && (
                    <>
                      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #fff', borderLeft: '2px solid #fff' }} />
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #fff', borderRight: '2px solid #fff' }} />
                    </>
                  )}
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{r.flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: active ? '#fff' : DARK, letterSpacing: '-0.3px' }}>{r.name}</div>
                    <div style={{
                      fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.04em',
                      color: active ? 'rgba(255,255,255,0.8)' : MUTED, marginTop: 3,
                    }}>
                      {r.standard}
                    </div>
                  </div>
                  {active && (
                    <div style={{
                      marginLeft: 'auto', width: 20, height: 20,
                      borderRadius: '50%', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
            disabled={!selected}
            style={{
              marginTop: 14, width: '100%', height: 54,
              borderRadius: 6,
              background: selected ? ORANGE : 'rgba(0,0,0,0.06)',
              border: 'none',
              color: selected ? '#fff' : 'rgba(0,0,0,0.25)',
              fontSize: 15, fontWeight: 600, fontFamily: FONT,
              cursor: selected ? 'pointer' : 'default',
              letterSpacing: '0.02em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 200ms ease, color 200ms ease, transform 180ms ease',
              animation: risen('380ms'),
            }}
            onPointerDown={e => {
              if (!selected) return;
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Let's build
            {selected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
