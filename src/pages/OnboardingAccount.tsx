import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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

// Grid-paper backdrop — a nod to a builder's plan sheet, not decoration for
// its own sake. Very faint so it reads as texture, not pattern.
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

function fieldLabelStyle(): React.CSSProperties {
  return {
    display: 'block', fontFamily: MONO, fontSize: 10, fontWeight: 600,
    letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase',
    marginBottom: 7, paddingLeft: 2,
  };
}

function corner(pos: 'tl' | 'br'): React.CSSProperties {
  const base: React.CSSProperties = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none' };
  return pos === 'tl'
    ? { ...base, top: -1, left: -1, borderTop: `2px solid ${ORANGE}`, borderLeft: `2px solid ${ORANGE}` }
    : { ...base, bottom: -1, right: -1, borderBottom: `2px solid ${ORANGE}`, borderRight: `2px solid ${ORANGE}` };
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 52,
  borderRadius: 4, background: '#fff',
  border: '1px solid rgba(0,0,0,0.1)',
  padding: '0 18px', fontSize: 16,
  fontFamily: FONT, color: DARK, outline: 'none',
  letterSpacing: '-0.1px', boxSizing: 'border-box',
};

function Field({ label, delay, children }: { label: string; delay: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 320, animation: risen(delay) }}>
      <label style={fieldLabelStyle()}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={corner('tl')} />
        <div style={corner('br')} />
        {children}
      </div>
    </div>
  );
}

interface Props {
  onComplete: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export function OnboardingAccount({ onComplete, updateSettings }: Props) {
  const [exiting, setExiting] = useState(false);
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function finish(finalName?: string) {
    const trimmed = (finalName ?? name).trim();
    if (trimmed) {
      localStorage.setItem('setout_user_name', trimmed);
      updateSettings({ userName: trimmed });
    }
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  // If a signup needs email confirmation, there's no session yet — this
  // picks it up once they tap the confirm link and come back (same tab or
  // a fresh one), the same way OnboardingEmail's magic link used to.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session.user.user_metadata?.name);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session.user.user_metadata?.name);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignUp() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail || password.length < 6 || submitting) return;

    setError(null);
    setSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: { name: trimmedName },
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);
    if (signUpError) { setError(signUpError.message); return; }

    if (data.session) {
      finish(trimmedName);
    } else {
      setSent(true);
    }
  }

  async function handleLogIn() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password || submitting) return;

    setError(null);
    setSubmitting(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setSubmitting(false);
    if (signInError) { setError(signInError.message); return; }
    finish(data.user.user_metadata?.name);
  }

  const canSubmit = mode === 'signup'
    ? name.trim() && email.trim() && password.length >= 6
    : email.trim() && password.length > 0;

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, ...gridBackground, zIndex: 9997, overflow: 'hidden' }}>
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
            <line x1="1" y1="5" x2="55" y2="5" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="48" style={{ animation: 'drawLine 900ms 480ms cubic-bezier(0.65,0,0.35,1) both' }} />
            <circle cx="55" cy="5" r="2.5" fill={ORANGE} style={{ animation: 'fadeIn 300ms 1380ms both' }} />
          </svg>

          {sent ? (
            <>
              <div style={{ marginTop: 44 }}>
                <StepBadge step={1} label="Pending" />
              </div>
              <h1 style={{
                margin: '28px 0 0',
                fontFamily: DISPLAY, fontSize: 40, fontWeight: 800,
                letterSpacing: '-0.5px', color: DARK, textTransform: 'uppercase',
                textAlign: 'center', lineHeight: 0.95,
              }}>
                Confirm your<br />email
              </h1>
              <p style={{
                margin: '18px 0 0',
                fontFamily: FONT, fontSize: 15, lineHeight: 1.65,
                color: MUTED, textAlign: 'center', maxWidth: 300,
              }}>
                We sent a confirmation link to <strong style={{ color: DARK }}>{email.trim()}</strong>. Tap it to finish creating your account.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: 28, background: 'none', border: 'none',
                  color: MUTED, fontSize: 13, fontFamily: MONO,
                  cursor: 'pointer', letterSpacing: '0.06em', textDecoration: 'underline',
                  textTransform: 'uppercase',
                }}
              >
                Back
              </button>
            </>
          ) : (
            <>
              <div style={{ marginTop: 40 }}>
                <StepBadge step={1} label="Account" />
              </div>

              <h1 style={{
                margin: '22px 0 0',
                fontFamily: DISPLAY, fontSize: 46, fontWeight: 800,
                letterSpacing: '-0.5px', color: DARK, textTransform: 'uppercase',
                textAlign: 'center', lineHeight: 0.95,
                animation: risen('160ms'),
              }}>
                {mode === 'signup' ? <>Create your<br />account</> : <>Welcome<br />back</>}
              </h1>

              <p style={{
                margin: '16px 0 0',
                fontFamily: FONT, fontSize: 15, lineHeight: 1.6,
                color: MUTED, textAlign: 'center', maxWidth: 280,
                animation: risen('220ms'),
              }}>
                {mode === 'signup' ? "Let's get you set up on site." : 'Log in to your Setout account.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 32, width: '100%', alignItems: 'center' }}>
                {mode === 'signup' && (
                  <Field label="Name" delay="280ms">
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      style={inputStyle}
                    />
                  </Field>
                )}
                <Field label="Email" delay="320ms">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    style={inputStyle}
                  />
                </Field>
                <Field label={mode === 'signup' ? 'Password · min. 6 characters' : 'Password'} delay="360ms">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignUp() : handleLogIn())}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    style={inputStyle}
                  />
                </Field>
              </div>

              {error && (
                <p style={{ margin: '14px 0 0', fontSize: 13, color: '#e53e3e', textAlign: 'center', maxWidth: 320, fontFamily: FONT }}>
                  {error}
                </p>
              )}

              <button
                onClick={mode === 'signup' ? handleSignUp : handleLogIn}
                disabled={submitting || !canSubmit}
                style={{
                  marginTop: 20, width: '100%', maxWidth: 320, height: 54,
                  borderRadius: 6,
                  background: ORANGE,
                  border: 'none',
                  color: '#fff',
                  fontSize: 15, fontWeight: 600, fontFamily: FONT,
                  cursor: submitting || !canSubmit ? 'default' : 'pointer',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  opacity: submitting || !canSubmit ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 180ms ease, opacity 180ms ease',
                  animation: risen('420ms'),
                }}
                onPointerDown={e => { if (!submitting && canSubmit) { e.currentTarget.style.transform = 'scale(0.98)'; } }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {submitting ? 'Please wait' : mode === 'signup' ? 'Create account' : 'Log in'}
                {!submitting && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError(null); }}
                style={{
                  marginTop: 20, background: 'none', border: 'none',
                  color: MUTED, fontSize: 13, fontFamily: MONO,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  animation: risen('460ms'),
                }}
              >
                {mode === 'signup' ? 'ALREADY HAVE AN ACCOUNT? ' : 'NEED AN ACCOUNT? '}
                <span style={{ color: ORANGE, fontWeight: 700, textDecoration: 'underline' }}>{mode === 'signup' ? 'LOG IN' : 'SIGN UP'}</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
