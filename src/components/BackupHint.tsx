import { useCloud } from '../lib/CloudContext';

// Small muted line that nudges data safety wherever users create content they'd
// hate to lose (receipts, tools, …). It adapts to the cloud-backup state:
//   • signed in            → reassure it's syncing
//   • cloud on, signed out → nudge sign-in for automatic sync
//   • cloud off            → point at the manual backup in Settings
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
    body = <><a href="#/settings" style={linkStyle}>Sign in from Settings</a> to back up &amp; sync your data across devices.</>;
  } else {
    body = <>This stays on your phone — <a href="#/settings" style={linkStyle}>back up in Settings</a> so you don’t lose it.</>;
  }

  return (
    <p style={{ margin: '0 4px 2px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
      {body}
    </p>
  );
}
