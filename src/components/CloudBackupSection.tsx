import { useState } from 'react';
import { useCloud } from '../lib/CloudContext';

// Optional cloud backup card for the Settings page. Renders nothing unless the
// Supabase keys are configured, so the app stays login-free by default — this is
// purely opt-in "sign in to store my data safely off this phone".

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '0.5px solid var(--color-border)', background: 'var(--color-bg)',
  fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)',
  outline: 'none', boxSizing: 'border-box', WebkitAppearance: 'none',
};

const primaryBtn: React.CSSProperties = {
  flex: 1, padding: '12px 14px', background: 'var(--color-orange)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-tile)', fontSize: 14, fontWeight: 500,
  fontFamily: 'inherit', cursor: 'pointer',
};
const secondaryBtn: React.CSSProperties = {
  flex: 1, padding: '12px 14px', background: 'transparent', color: 'var(--color-text)',
  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius-tile)', fontSize: 14,
  fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
};

// Keep a focused field above the on-screen keyboard. The keyboard is
// resize:'none' (it overlays rather than shrinking the webview), and this
// Cloud backup section sits low in Settings, so without this the email/code
// fields get hidden behind it. Mirrors NumberInput's handler.
function keepAboveKeyboard(e: React.FocusEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  setTimeout(() => {
    if (el.getBoundingClientRect().bottom > window.innerHeight * 0.5) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 300);
}

function ago(ts: number | null): string {
  if (!ts) return 'never';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24); return `${d} day${d === 1 ? '' : 's'} ago`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function CloudBackupSection() {
  const cloud = useCloud();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  if (!cloud.configured) return null;

  const label = (
    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 8 }}>
      Cloud backup
    </div>
  );

  const message = (cloud.error || cloud.status) && (
    <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: cloud.error ? '#dc2626' : '#16a34a' }}>
      {cloud.error ?? cloud.status}
    </p>
  );

  // ── Signed in ──────────────────────────────────────────────────────────────
  if (cloud.signedIn) {
    const needsRestore = cloud.remoteBackupAt != null && cloud.lastSyncAt == null;
    return (
      <div>
        {label}
        <div style={{ padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--color-card)', border: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cloud.email}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)' }}>
            {cloud.lastSyncAt ? `Synced automatically · ${ago(cloud.lastSyncAt)}` : 'Setting up…'}
          </p>

          {needsRestore && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text)', lineHeight: 1.4 }}>
              You have a cloud backup from {ago(cloud.remoteBackupAt)}. Restore it to copy your jobs, photos and receipts onto this phone.
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cloud.backupNow} disabled={cloud.busy} style={{ ...primaryBtn, opacity: cloud.busy ? 0.7 : 1 }}>
              {cloud.busy && cloud.status?.startsWith('Backing') ? 'Syncing…' : 'Sync now'}
            </button>
            <button
              onClick={() => { if (window.confirm('Restore your cloud backup to this device? This replaces the jobs, photos and receipts currently on this phone.')) cloud.restore(); }}
              disabled={cloud.busy}
              style={{ ...secondaryBtn, opacity: cloud.busy ? 0.7 : 1 }}
            >
              Restore
            </button>
          </div>

          {message}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
            <button onClick={cloud.signOut} disabled={cloud.busy} style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--color-orange)', fontFamily: 'inherit', cursor: 'pointer' }}>
              Sign out
            </button>
            <button
              onClick={() => { if (window.confirm('Permanently delete your account and everything stored in the cloud? Your data on this phone stays, but your account and cloud backup are erased and can’t be recovered.')) cloud.deleteAccount(); }}
              disabled={cloud.busy}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#dc2626', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              Delete account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Code sent — awaiting the 6-digit code ────────────────────────────────────
  if (cloud.phase === 'code-sent') {
    const canVerify = code.trim().length >= 6 && !cloud.busy;
    return (
      <div>
        {label}
        <div style={{ padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--color-card)', border: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.4 }}>
            Enter the code we emailed to <strong>{cloud.pendingEmail}</strong>.
          </p>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
            onFocus={keepAboveKeyboard}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Code"
            style={{ ...inputStyle, letterSpacing: '4px', textAlign: 'center', fontSize: 18 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => cloud.verifyCode(code)} disabled={!canVerify} style={{ ...primaryBtn, opacity: canVerify ? 1 : 0.6 }}>
              {cloud.busy ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <button onClick={() => { setCode(''); cloud.cancelCode(); }} disabled={cloud.busy} style={secondaryBtn}>
              Back
            </button>
          </div>
          {message}
        </div>
      </div>
    );
  }

  // ── Signed out — enter email ─────────────────────────────────────────────────
  const canSend = EMAIL_RE.test(email.trim()) && !cloud.busy;
  return (
    <div>
      {label}
      <p style={{ margin: '-4px 0 10px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
        Right now your jobs, photos and receipts are saved <strong>only on this phone</strong> — if it’s lost, broken or replaced, they’re gone. Sign in and everything backs up automatically and syncs across your devices. It’s the only way to keep your data safe.
      </p>
      <div style={{ padding: 14, borderRadius: 'var(--radius-card)', background: 'var(--color-card)', border: '0.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={keepAboveKeyboard}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@email.com"
          style={inputStyle}
        />
        <button onClick={() => cloud.sendCode(email)} disabled={!canSend} style={{ ...primaryBtn, opacity: canSend ? 1 : 0.6 }}>
          {cloud.busy ? 'Sending…' : 'Email me a sign-in code'}
        </button>
        {message}
        <p style={{ margin: 0, fontSize: 11, color: 'var(--color-muted)', lineHeight: 1.4 }}>
          We’ll email you a sign-in code — no password to remember.
        </p>
      </div>
    </div>
  );
}
