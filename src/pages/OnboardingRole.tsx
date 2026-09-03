import { useState } from 'react';
import type { Settings } from '../types';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const MUTED = '#999';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function risen(delay: string) {
  return `riseIn 650ms ${EASE} ${delay} both`;
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
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9995 }}>
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
            What describes<br />you best?
          </h1>

          <p style={{
            margin: '20px 0 0',
            fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
            color: MUTED, textAlign: 'center', maxWidth: 260,
            animation: risen('240ms'),
          }}>
            We'll tailor the experience to suit you.
          </p>

          <div style={{
            marginTop: 40, width: '100%',
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: risen('340ms'),
          }}>
            {ROLES.map(r => {
              const active = selected === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  style={{
                    width: '100%', minHeight: 72,
                    borderRadius: 18,
                    background: active ? ORANGE : '#fff',
                    border: `1.5px solid ${active ? ORANGE : 'rgba(0,0,0,0.08)'}`,
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    transition: 'border-color 180ms ease, background 180ms ease',
                    fontFamily: FONT, textAlign: 'left',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: active ? '#fff' : DARK, letterSpacing: '-0.4px' }}>{r.label}</div>
                    <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : MUTED, marginTop: 2 }}>{r.subtitle}</div>
                    {active && r.id === 'apprentice' && (
                      <div style={{ fontSize: 12, color: '#fff', marginTop: 6, lineHeight: 1.5 }}>
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
            Continue
          </button>

        </div>
      </div>
    </div>
  );
}
