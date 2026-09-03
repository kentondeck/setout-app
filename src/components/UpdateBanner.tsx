import { useRegisterSW } from 'virtual:pwa-register/react';

// When Vercel publishes a new bundle, the service worker sees the change and
// this hook flips needRefresh to true. We show a small orange bar; tap to
// activate the waiting SW and reload the page → fresh code. Kills the
// "delete + reinstall the app to see the fix" pain on TestFlight/PWA.
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every 5 min while the app is open, so a deploy
      // that lands while the tradie is mid-job surfaces without a cold-start.
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 72px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 14,
        background: 'var(--color-orange)',
        color: '#fff',
        boxShadow: '0 8px 24px -6px rgba(0,0,0,0.24)',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, letterSpacing: '-0.1px' }}>
        New version of Setout available
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: 'none',
          background: '#fff',
          color: 'var(--color-orange)',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          letterSpacing: '-0.1px',
        }}
      >
        Reload
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss"
        style={{
          padding: '8px 6px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.85)',
          fontSize: 18,
          fontFamily: 'inherit',
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
