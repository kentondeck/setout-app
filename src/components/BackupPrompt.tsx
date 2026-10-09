import { useEffect } from 'react';
import { useCloud } from '../lib/CloudContext';

// One-time bottom sheet nudging a signed-out user to back up, shown the first
// time they save something they'd hate to lose. Mounted globally (next to the
// Paywall) and driven by CloudContext.backupPromptOpen. Uses hash navigation so
// it doesn't depend on being inside the Router.

export function BackupPrompt() {
  const { backupPromptOpen, dismissBackupPrompt } = useCloud();

  useEffect(() => {
    if (!backupPromptOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [backupPromptOpen]);

  if (!backupPromptOpen) return null;

  const goSignIn = () => { dismissBackupPrompt(); window.location.hash = '#/settings'; };

  return (
    <>
      <div onClick={dismissBackupPrompt} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }} />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390,
        background: 'var(--color-bg)', borderRadius: '20px 20px 0 0',
        zIndex: 401, padding: '12px 22px calc(24px + env(safe-area-inset-bottom))',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', alignSelf: 'center', marginBottom: 18 }} />

        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--color-text)' }}>
          Keep your work safe
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          That's saved <strong style={{ color: 'var(--color-text)' }}>only on this phone</strong> right now. Sign in and your jobs, photos and receipts back up automatically — so you won't lose them if your phone's lost or replaced.
        </p>

        <button
          onClick={goSignIn}
          style={{
            width: '100%', padding: '15px 20px',
            background: 'var(--color-orange)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-tile)',
            fontSize: 16, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Sign in to back up
        </button>
        <button
          onClick={dismissBackupPrompt}
          style={{
            width: '100%', padding: '12px 20px', marginTop: 8,
            background: 'transparent', color: 'var(--color-muted)',
            border: 'none', borderRadius: 'var(--radius-tile)',
            fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          Not now
        </button>
      </div>
    </>
  );
}
