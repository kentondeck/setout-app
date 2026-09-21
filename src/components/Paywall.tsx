import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '../lib/SubscriptionContext';

// Setout Pro paywall bottom sheet.
// Presented by SubscriptionContext.showPaywall() — either directly (from
// Settings) or after the free-per-day gate closes (from any calc page).
// Renders nothing when paywallOpen is false so it's cheap to always mount.
//
// Apple guideline 3.1.2 (auto-renewing subscriptions) requires every paywall
// to display: subscription title, price + billing period, auto-renewal
// disclosure, restore button, and links to Terms of Use + Privacy Policy.
// All of those live in the small-print footer below.

const FEATURES = [
  'Every calculator, unlimited use',
  'Full Sequencer job library (NZ + AU)',
  'Photo Quote with saved prices',
  'Save jobs, photos, and quotes offline',
];

export function Paywall() {
  const {
    paywallOpen,
    hidePaywall,
    isReady,
    weeklyPriceString,
    purchaseWeekly,
    restorePurchases,
    presentCodeRedemption,
    lastError,
    clearError,
  } = useSubscription();

  // Prevent body scroll while the sheet is open. Mirrors the pattern used by
  // the job-photos + notes sheets so behaviour is consistent.
  useEffect(() => {
    if (!paywallOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [paywallOpen]);

  useEffect(() => {
    // Clear any stale error whenever the sheet is reopened.
    if (paywallOpen) clearError();
  }, [paywallOpen, clearError]);

  if (!paywallOpen) return null;

  const isNative = Capacitor.isNativePlatform();
  const displayPrice = weeklyPriceString ?? '$1.99 / week';
  const platform = Capacitor.getPlatform();

  return (
    <>
      <div
        onClick={hidePaywall}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 390, maxHeight: '90vh',
        background: 'var(--color-bg)', borderRadius: '20px 20px 0 0',
        display: 'flex', flexDirection: 'column',
        zIndex: 401,
      }}>
        {/* Drag handle + close */}
        <div style={{ padding: '10px 20px 4px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)', alignSelf: 'center' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button
              onClick={hidePaywall}
              aria-label="Close"
              style={{
                background: 'var(--color-card)', border: 'none',
                width: 36, height: 36, borderRadius: 999,
                cursor: 'pointer', color: 'var(--color-text)',
                fontSize: 22, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 0,
              }}
            >×</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 20px' }}>
          <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, fontWeight: 600, color: 'var(--color-orange)', textTransform: 'uppercase' }}>
              Setout Pro
            </div>
            <h2 style={{ margin: '6px 0 6px', fontSize: 26, fontWeight: 700, letterSpacing: '-0.6px', color: 'var(--color-text)' }}>
              Every tool, every day.
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.4 }}>
              Start with a 14-day free trial. Cancel anytime.
            </p>
          </div>

          {/* Features */}
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--color-text)' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999, background: 'var(--color-orange)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {/* Plan card */}
          <div style={{
            background: 'var(--color-card)',
            border: '2px solid var(--color-orange)',
            borderRadius: 'var(--radius-card)',
            padding: '16px 18px',
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Weekly</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{displayPrice}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              14-day free trial, then {displayPrice}. Auto-renews weekly.
            </div>
          </div>

          {/* Primary CTA */}
          <button
            onClick={purchaseWeekly}
            disabled={!isReady && isNative}
            style={{
              width: '100%', padding: '14px 20px',
              background: 'var(--color-orange)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-tile)',
              fontSize: 16, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              opacity: (!isReady && isNative) ? 0.6 : 1,
            }}
          >
            {isNative ? 'Start 14-day free trial' : 'Available in the Setout app'}
          </button>

          {/* Secondary actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={presentCodeRedemption}
              disabled={!isNative}
              style={{
                flex: 1, padding: '10px 12px',
                background: 'transparent', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-tile)',
                fontSize: 14, fontWeight: 500, cursor: isNative ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: isNative ? 1 : 0.5,
              }}
            >
              Redeem code
            </button>
            <button
              onClick={restorePurchases}
              disabled={!isNative}
              style={{
                flex: 1, padding: '10px 12px',
                background: 'transparent', color: 'var(--color-text)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-tile)',
                fontSize: 14, fontWeight: 500, cursor: isNative ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                opacity: isNative ? 1 : 0.5,
              }}
            >
              Restore purchases
            </button>
          </div>

          {lastError && (
            <div style={{
              marginTop: 12, padding: '10px 12px',
              background: 'rgba(220, 60, 60, 0.08)', color: '#c1272d',
              borderRadius: 8, fontSize: 13,
            }}>
              {lastError}
            </div>
          )}

          {/* Apple-required small print. This block must exist on every paywall
              or App Store review will reject on 3.1.2(a). */}
          <p style={{ marginTop: 18, marginBottom: 6, fontSize: 11, lineHeight: 1.5, color: 'var(--color-muted)' }}>
            Payment will be charged to your {platform === 'android' ? 'Google Play' : 'Apple ID'} account at
            confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before
            the end of the current period. Manage or cancel in your account settings after purchase.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12 }}>
            <a href="#/privacy" onClick={hidePaywall} style={{ color: 'var(--color-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="https://setoutapp.com.au/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-muted)', textDecoration: 'underline' }}>Terms of Use</a>
          </div>
        </div>
      </div>
    </>
  );
}
