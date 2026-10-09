import { useCloud } from '../lib/CloudContext';

// Small muted line that nudges data safety wherever users create content they'd
// hate to lose (receipts, tools, …). It adapts to the cloud-backup state:
//   • signed in            → reassure it's syncing
//   • cloud on, signed out → nudge sign-in for automatic sync
//   • cloud off            → just note it's stored on this phone (no cloud configured)
// Routes are hash-based, so a plain #/settings anchor navigates correctly.

const linkStyle: React.CSSProperties = {
  color: 'var(--color-orange)', textDecoration: 'none', fontWeight: 500,
};

export function BackupHint() {
  const cloud = useCloud();

  let body: React.ReactNode;
  if (cloud.configured && cloud.signedIn) {
    body = <>Backing up automatically to your account.</>;
  } else if (cloud.configured) {
    body = <>Saved only on this phone — <a href="#/settings" style={linkStyle}>sign in from Settings</a> to back it up, or you’ll lose it if your phone is lost or replaced.</>;
  } else {
    body = <>This is saved only on this phone.</>;
  }

  return (
    <p style={{ margin: '0 4px 2px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
      {body}
    </p>
  );
}
