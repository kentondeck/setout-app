import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Settings } from '../types';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const MUTED = '#999';
const BG = '#f5f5f3';
const FONT = "Inter, -apple-system, sans-serif";
const MONO = "'JetBrains Mono', monospace";
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

function risen(delay: string) {
  return `riseIn 650ms ${EASE} ${delay} both`;
}

// Matches the "mm" unit-subscript treatment from the diagram design system —
// small mono caption at reduced opacity, not a dominant typographic voice.
function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: risen('120ms') }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: i === step ? 18 : 6, height: 6, borderRadius: 3,
          background: i <= step ? ORANGE : 'rgba(0,0,0,0.12)',
          transition: 'width 200ms ease, background 200ms ease',
        }} />
      ))}
      <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED, opacity: 0.72, marginLeft: 4 }}>
        {step}/3
      </span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 56,
  borderRadius: 16, background: '#fff',
  border: '1.5px solid rgba(0,0,0,0.08)',
  padding: '0 20px', fontSize: 17,
  fontFamily: FONT, color: DARK, outline: 'none',
  letterSpacing: '-0.3px', boxSizing: 'border-box',
};

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
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9997 }}>
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

          {sent ? (
            <>
              <h1 style={{
                margin: '40px 0 0',
                fontFamily: FONT, fontSize: 32, fontWeight: 600,
                letterSpacing: '-1px', color: DARK,
                textAlign: 'center', lineHeight: 1.15,
              }}>
                Confirm your email
              </h1>
              <p style={{
                margin: '20px 0 0',
                fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
                color: MUTED, textAlign: 'center', maxWidth: 300,
              }}>
                We sent a confirmation link to <strong style={{ color: DARK }}>{email.trim()}</strong>. Tap it to finish creating your account.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: 32, background: 'none', border: 'none',
                  color: MUTED, fontSize: 15, fontFamily: FONT,
                  cursor: 'pointer', letterSpacing: '-0.2px', textDecoration: 'underline',
                }}
              >
                Back
              </button>
            </>
          ) : (
            <>
              <div style={{ marginTop: 32 }}>
                <StepIndicator step={1} />
              </div>

              <h1 style={{
                margin: '24px 0 0',
                fontFamily: FONT, fontSize: 36, fontWeight: 600,
                letterSpacing: '-1.2px', color: DARK,
                textAlign: 'center', lineHeight: 1.15,
                animation: risen('160ms'),
              }}>
                {mode === 'signup' ? <>Create your<br />account</> : <>Welcome<br />back</>}
              </h1>

              <p style={{
                margin: '20px 0 0',
                fontFamily: FONT, fontSize: 16, lineHeight: 1.65,
                color: MUTED, textAlign: 'center', maxWidth: 280,
                animation: risen('240ms'),
              }}>
                {mode === 'signup' ? "Let's get you set up." : 'Log in to your Setout account.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 40, width: '100%', alignItems: 'center' }}>
                {mode === 'signup' && (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your first name"
                    autoComplete="given-name"
                    style={{ ...inputStyle, maxWidth: 320, animation: risen('300ms') }}
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  style={{ ...inputStyle, maxWidth: 320, animation: risen('340ms') }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (mode === 'signup' ? handleSignUp() : handleLogIn())}
                  placeholder={mode === 'signup' ? 'Password (min. 6 characters)' : 'Password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  style={{ ...inputStyle, maxWidth: 320, animation: risen('380ms') }}
                />
              </div>

              {error && (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: '#e53e3e', textAlign: 'center', maxWidth: 320 }}>
                  {error}
                </p>
              )}

              <button
                onClick={mode === 'signup' ? handleSignUp : handleLogIn}
                disabled={submitting || !canSubmit}
                style={{
                  marginTop: 12, width: '100%', maxWidth: 320, height: 56,
                  borderRadius: 16,
                  background: ORANGE,
                  border: 'none',
                  color: '#fff',
                  fontSize: 16, fontWeight: 500, fontFamily: FONT,
                  cursor: submitting || !canSubmit ? 'default' : 'pointer',
                  letterSpacing: '-0.2px',
                  opacity: submitting || !canSubmit ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 180ms ease, opacity 180ms ease',
                  animation: risen('420ms'),
                }}
                onPointerDown={e => { if (!submitting && canSubmit) { e.currentTarget.style.transform = 'scale(0.97)'; } }}
                onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {submitting ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
              </button>

              <button
                onClick={() => { setMode(m => m === 'signup' ? 'login' : 'signup'); setError(null); }}
                style={{
                  marginTop: 16, background: 'none', border: 'none',
                  color: MUTED, fontSize: 15, fontFamily: FONT,
                  cursor: 'pointer', letterSpacing: '-0.2px',
                  animation: risen('460ms'),
                }}
              >
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <span style={{ color: ORANGE, fontWeight: 500 }}>{mode === 'signup' ? 'Log in' : 'Sign up'}</span>
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
