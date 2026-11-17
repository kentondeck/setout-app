import { useCloud } from '../lib/CloudContext';
import { useSubscription } from '../lib/SubscriptionContext';

// Small muted line that nudges data safety wherever users create content they'd
// hate to lose (receipts, tools, …). It adapts to the cloud-backup state:
//   • syncing (Pro + signed in) → reassure it's syncing
//   • signed in, no Pro         → say syncing is paused, don't claim it's safe
//   • cloud on, signed out      → nudge toward Pro, which is what hosts it
//   • cloud off                 → just note it's stored on this phone
// Routes are hash-based, so a plain #/settings anchor navigates correctly.

const linkStyle: React.CSSProperties = {
  color: 'var(--color-orange)', textDecoration: 'none', fontWeight: 500,
};

export function BackupHint() {
  const cloud = useCloud();
  const { isPro } = useSubscription();

  let body: React.ReactNode;
  if (cloud.configured && cloud.signedIn && isPro) {
    body = <>Backing up automatically to your account.</>;
  } else if (cloud.configured && cloud.signedIn) {
    body = <>Saved only on this phone — backing up is paused. <a href="#/settings" style={linkStyle}>Resume in Settings</a>.</>;
  } else if (cloud.configured) {
    body = <>Saved only on this phone — <a href="#/settings" style={linkStyle}>Setout Pro</a> backs it up automatically, or you’ll lose it if your phone is lost or replaced.</>;
  } else {
    body = <>This is saved only on this phone.</>;
  }

  return (
    <p style={{ margin: '0 4px 2px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
      {body}
    </p>
  );
}
