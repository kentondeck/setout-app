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

type Role = 'business' | 'tradie' | 'apprentice';

const ROLES: { id: Role; label: string; subtitle: string }[] = [
  { id: 'business', label: 'Business Owner',  subtitle: 'Running a contracting business' },
  { id: 'tradie',   label: 'Tradie',           subtitle: 'Working on the tools'           },
  { id: 'apprentice', label: 'Apprentice',     subtitle: 'Learning the trade'             },
];

interface Props {
  onComplete: (role: Role) => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export function OnboardingRole({ onComplete, updateSettings }: Props) {
  const [exiting, setExiting] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);

  function handleContinue() {
    if (!selected) return;

    // Save role
    localStorage.setItem('setout_role', selected);

    // If apprentice, enable apprentice mode in settings
    if (selected === 'apprentice') {
      updateSettings({ apprenticeMode: true });
    }

    setExiting(true);
    setTimeout(() => onComplete(selected), 260);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, ...gridBackground, zIndex: 9995 }}>
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
            <StepBadge step={3} label="Trade" />
          </div>

          <h1 style={{
            margin: '22px 0 0',
            fontFamily: DISPLAY, fontSize: 44, fontWeight: 800,
            letterSpacing: '-0.5px', color: DARK, textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 0.95,
            animation: risen('160ms'),
          }}>
            What describes<br />you best?
          </h1>

          <p style={{
            margin: '16px 0 0',
            fontFamily: FONT, fontSize: 15, lineHeight: 1.6,
            color: MUTED, textAlign: 'center', maxWidth: 260,
            animation: risen('220ms'),
          }}>
            We'll tailor the experience to suit you.
          </p>

          <div style={{
            marginTop: 36, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 10,
            animation: risen('300ms'),
          }}>
            {ROLES.map(r => {
              const active = selected === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  style={{
                    position: 'relative',
                    width: '100%', minHeight: 68,
                    borderRadius: 6,
                    background: active ? ORANGE : '#fff',
                    border: `1px solid ${active ? ORANGE : 'rgba(0,0,0,0.1)'}`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'border-color 180ms ease, background 180ms ease',
                    fontFamily: FONT, textAlign: 'left',
                  }}
                >
                  {active && (
                    <>
                      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '2px solid #fff', borderLeft: '2px solid #fff' }} />
                      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '2px solid #fff', borderRight: '2px solid #fff' }} />
                    </>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: active ? '#fff' : DARK, letterSpacing: '-0.3px' }}>{r.label}</div>
                    <div style={{
                      fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: '0.02em',
                      color: active ? 'rgba(255,255,255,0.8)' : MUTED, marginTop: 3,
                    }}>
                      {r.subtitle}
                    </div>
                    {active && r.id === 'apprentice' && (
                      <div style={{ fontSize: 12, color: '#fff', marginTop: 8, lineHeight: 1.5, fontFamily: FONT }}>
                        Apprentice mode will be turned on — you can change this in Settings.
                      </div>
                    )}
                  </div>
                  {active && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
            Continue
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
