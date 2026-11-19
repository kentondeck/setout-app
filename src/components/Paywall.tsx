import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSubscription } from '../lib/SubscriptionContext';
import type { PlanOption } from '../lib/SubscriptionContext';
import type { PlanId } from '../lib/subscription';
import { PLAN_RENEWAL_ADVERB } from '../lib/subscription';
import { FREE_CALCULATOR_LABELS } from '../lib/calculators';

// Setout Pro paywall bottom sheet.
// Presented by SubscriptionContext.showPaywall() — either directly (from
// Settings) or after the free-run gate closes (from any calc page).
// Renders nothing when paywallOpen is false so it's cheap to always mount.
//
// Apple guideline 3.1.2 (auto-renewing subscriptions) requires every paywall
// to display: subscription title, price + billing period, auto-renewal
// disclosure, restore button, and links to Terms of Use + Privacy Policy.
// All of those live in the small-print footer below.
//
// Ordering of the value props is deliberate. Review rejected an earlier build
// under 3.1.2 because the subscription appeared to buy nothing but offline
// calculators — a static feature, which Apple requires be sold as a one-time
// purchase rather than a recurring one. The hosted parts of Pro (off-device
// backup of jobs, photos and quotes, and restore onto a new phone) are the
// ongoing service the subscription actually pays for, so they lead.

// Every line here has to be something Pro actually unlocks, and the free-tier
// line below has to match what genuinely stays free. Offline use belongs to
// everyone, so it is deliberately absent — claiming it would be untrue and a
// metadata rejection waiting to happen.
const FEATURES = [
  'Cloud backup for every job, photo and quote',
  'Restore your whole history on a new phone',
  'All 15 calculators, unlimited use',
];

// Built from the calculator metadata so the purchase screen can't keep
// promising a calculator that has since moved behind Pro. The partial cases —
// concrete slabs, the first half of each Sequencer guide — aren't expressible
// as flags, so they stay as words below.
const freeCalculatorList = FREE_CALCULATOR_LABELS.length > 1
  ? `${FREE_CALCULATOR_LABELS.slice(0, -1).join(', ')} and ${FREE_CALCULATOR_LABELS[FREE_CALCULATOR_LABELS.length - 1]}`
  : FREE_CALCULATOR_LABELS[0] ?? '';

// Saving against the costliest plan on offer, worked out from the store's own
// annualised prices so it can never drift from what the user is billed. The
// baseline is whichever plan works out dearest over a year rather than a named
// plan id, so the badge keeps working whatever mix of plans the store returns.
function savingVsShortestPlan(plan: PlanOption, plans: PlanOption[]): number | null {
  if (!plan.pricePerYear) return null;
  const baseline = Math.max(...plans.map(p => p.pricePerYear ?? 0));
  if (baseline <= 0 || plan.pricePerYear >= baseline) return null;
  const saving = Math.round(((baseline - plan.pricePerYear) / baseline) * 100);
  return saving >= 5 ? saving : null;
}

export function Paywall() {
  const {
    paywallOpen,
    hidePaywall,
    plans,
    purchase,
    restorePurchases,
    presentCodeRedemption,
    lastError,
    clearError,
    purchasing,
  } = useSubscription();

  // Which plan the CTA will buy. Defaults to the first plan the store returns,
  // which is the longest commitment (see comparePlans) — better value for the
  // user and a far healthier subscription than weekly-only billing.
  const [selectedId, setSelectedId] = useState<PlanId | null>(null);
  const selected = plans.find(p => p.id === selectedId) ?? plans[0] ?? null;

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
  const platform = Capacitor.getPlatform();
  const canBuy = isNative && !purchasing && !!selected;

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
              Your whole toolkit, unlocked
            </h2>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--color-muted)', lineHeight: 1.4 }}>
              Cloud backup for every job, photo and quote — plus unlimited use of every calculator.
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

          {/* Stating the free tier plainly is deliberate: it's honest, it
              lowers the pressure, and it makes clear to anyone reviewing the
              app that Setout is usable without subscribing at all. */}
          <p style={{ margin: '-10px 0 18px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.45, textAlign: 'center' }}>
            {freeCalculatorList} stay free and unlimited — plus concrete slabs, saved jobs, receipts and your tool list, and the first half of every Sequencer guide.
          </p>

          {/* Plan picker. The billed amount is the largest, most prominent
              pricing element on each row; the weekly equivalent and any free
              trial are intentionally subordinate in size and position beneath
              it (App Store guideline 3.1.2(c)). Prices come straight from
              StoreKit / Play so they always match what's charged (2.1(b)). */}
          {plans.length === 0 ? (
            <div style={{
              background: 'var(--color-card)', borderRadius: 'var(--radius-card)',
              padding: '18px', marginBottom: 14, textAlign: 'center',
              fontSize: 15, color: 'var(--color-muted)',
            }}>
              Loading plans…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {plans.map(plan => {
                const active = selected?.id === plan.id;
                const saving = savingVsShortestPlan(plan, plans);
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedId(plan.id)}
                    aria-pressed={active}
                    style={{
                      position: 'relative', width: '100%', textAlign: 'left',
                      background: 'var(--color-card)',
                      border: active ? '2px solid var(--color-orange)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-card)',
                      padding: active ? '16px 17px' : '17px 18px',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', textTransform: 'capitalize' }}>
                        {plan.id}
                      </div>
                      {plan.trialLabel && (
                        <div style={{ marginTop: 2, fontSize: 13, color: 'var(--color-muted)' }}>
                          {plan.trialLabel}
                        </div>
                      )}
                      {saving !== null && (
                        <div style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--color-orange)' }}>
                          Save {saving}%
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 3 }}>
                        <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--color-text)', lineHeight: 1 }}>
                          {plan.priceString}
                        </span>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>
                          /{plan.periodNoun}
                        </span>
                      </div>
                      {plan.perWeekString && (
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-muted)' }}>
                          about {plan.perWeekString} a week
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Primary CTA */}
          <button
            onClick={() => selected && purchase(selected.id)}
            disabled={!canBuy}
            style={{
              width: '100%', padding: '14px 20px',
              background: 'var(--color-orange)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-tile)',
              fontSize: 16, fontWeight: 600,
              cursor: canBuy ? 'pointer' : 'default',
              fontFamily: 'inherit',
              opacity: purchasing ? 0.7 : 1,
            }}
          >
            {!isNative
              ? 'Available in the Setout app'
              : purchasing
                ? 'Processing…'
                : selected?.trialLabel
                  ? 'Start free trial'
                  : 'Subscribe'}
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
            {selected?.trialLabel
              ? `Your ${selected.trialLabel} starts today. Unless cancelled at least 24 hours before it ends, your ${platform === 'android' ? 'Google Play' : 'Apple ID'} account is charged ${selected.priceString} and the subscription renews ${PLAN_RENEWAL_ADVERB[selected.id]} at ${selected.priceString} until cancelled. `
              : selected
                ? `${selected.priceString} will be charged to your ${platform === 'android' ? 'Google Play' : 'Apple ID'} account at confirmation of purchase, and renews ${PLAN_RENEWAL_ADVERB[selected.id]} at ${selected.priceString} unless cancelled at least 24 hours before the end of the current period. `
                : `Payment will be charged to your ${platform === 'android' ? 'Google Play' : 'Apple ID'} account at confirmation of purchase, and renews automatically unless cancelled at least 24 hours before the end of the current period. `}
            Manage or cancel in your account settings after purchase.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 12 }}>
            <a href="#/privacy" onClick={hidePaywall} style={{ color: 'var(--color-muted)', textDecoration: 'underline' }}>Privacy Policy</a>
            <a href="#/terms" onClick={hidePaywall} style={{ color: 'var(--color-muted)', textDecoration: 'underline' }}>Terms of Use</a>
          </div>
        </div>
      </div>
    </>
  );
}
