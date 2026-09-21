import { useState } from 'react';
import { detectRegion } from '../lib/detectRegion';
import type { Region, Settings } from '../types';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const MUTED = '#999';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function risen(delay: string) {
  return `riseIn 650ms ${EASE} ${delay} both`;
}

function UserIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="6" r="3" stroke={color} strokeWidth="1.5" />
      <path d="M3 15c0-3 2.7-5 6-5s6 2 6 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
      <path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: FONT, fontSize: 13, fontWeight: 500, color: DARK,
  letterSpacing: '-0.1px',
};

const helpStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontFamily: FONT, fontSize: 12, color: MUTED, opacity: 0.8,
  letterSpacing: '-0.1px', lineHeight: 1.45,
};

const COUNTRIES: { code: Region; name: string }[] = [
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
];

interface Props {
  onComplete: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export function OnboardingSetup({ onComplete, updateSettings }: Props) {
  const [exiting, setExiting] = useState(false);
  // Pre-selected from device locale/timezone so the common case is one tap.
  const [country, setCountry] = useState<Region>(() => detectRegion());
  const [name, setName] = useState('');
  const [focused, setFocused] = useState(false);

  function handleContinue() {
    if (exiting) return;
    const trimmedName = name.trim();

    // Both values live in localStorage only — no account, no network, works offline.
    localStorage.setItem('setout_region', country);
    if (trimmedName) localStorage.setItem('setout_user_name', trimmedName);
    updateSettings({ region: country, userName: trimmedName });

    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9997 }}>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        padding: '56px 28px 32px',
        ...(exiting ? {
          opacity: 0,
          transform: 'translateY(-16px)',
          transition: 'opacity 240ms ease-in, transform 240ms ease-in',
        } : {}),
      }}>

        {/* Brand mark — left aligned, so the whole screen reads on one axis */}
        <div style={{ animation: risen('0ms') }}>
          <span style={{ fontWeight: 500, letterSpacing: '-0.8px', fontSize: 24, lineHeight: 1, fontFamily: FONT }}>
            <span style={{ color: DARK }}>set</span>
            <span style={{ color: ORANGE }}>out</span>
          </span>
          <div style={{ width: 22, height: 1.5, background: ORANGE, marginTop: 12 }} />
        </div>

        <h1 style={{
          margin: '28px 0 0',
          fontFamily: FONT, fontSize: 34, fontWeight: 600,
          letterSpacing: '-1.2px', color: DARK,
          lineHeight: 1.15,
          animation: risen('120ms'),
        }}>
          Two taps,<br />then you're in.
        </h1>

        {/* Country */}
        <div style={{ marginTop: 40, animation: risen('200ms') }}>
          <p style={labelStyle}>Where are you building?</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            {COUNTRIES.map(c => {
              const active = country === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => setCountry(c.code)}
                  style={{
                    flex: 1, height: 62,
                    borderRadius: 16,
                    background: active ? ORANGE : '#fff',
                    border: `1.5px solid ${active ? ORANGE : 'rgba(0,0,0,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: 'pointer',
                    transition: 'border-color 180ms ease, background 180ms ease',
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500, color: active ? '#fff' : DARK, letterSpacing: '-0.2px' }}>
                    {c.name}
                  </span>
                  {active && (
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p style={helpStyle}>Sets your building codes and standards.</p>
        </div>

        {/* Name */}
        <div style={{ marginTop: 32, animation: risen('280ms') }}>
          <p style={labelStyle}>What should we call you?</p>

          <div style={{ position: 'relative', marginTop: 10 }}>
            <span style={{
              position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)',
              display: 'flex', pointerEvents: 'none',
            }}>
              <UserIcon color={focused ? ORANGE : MUTED} />
            </span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
              placeholder="Your first name"
              autoComplete="given-name"
              maxLength={40}
              style={{
                width: '100%', height: 56,
                borderRadius: 16, background: '#fff',
                padding: '0 20px 0 48px', fontSize: 17,
                fontFamily: FONT, color: DARK, outline: 'none',
                letterSpacing: '-0.3px', boxSizing: 'border-box',
                border: `1.5px solid ${focused ? ORANGE : 'rgba(0,0,0,0.08)'}`,
                boxShadow: focused ? '0 0 0 4px rgba(255,90,31,0.1)' : 'none',
                transition: 'border-color 160ms ease, box-shadow 160ms ease',
              }}
            />
          </div>

          <p style={helpStyle}>Optional — used to personalise the app.</p>
        </div>

        {/* CTA pinned to the bottom rather than floating mid-screen */}
        <button
          onClick={handleContinue}
          style={{
            marginTop: 'auto', width: '100%', height: 56,
            borderRadius: 16,
            background: ORANGE,
            border: 'none',
            color: '#fff',
            fontSize: 16, fontWeight: 500, fontFamily: FONT,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 24px -10px rgba(255,90,31,0.65)',
            transition: 'transform 180ms ease',
            animation: risen('360ms'),
          }}
          onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          Let's build
        </button>

      </div>
    </div>
  );
}
