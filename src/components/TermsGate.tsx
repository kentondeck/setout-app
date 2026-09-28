import { MarkdownBody } from './MarkdownDoc';
// TERMS.md is the single source of truth — this gate and the /terms page render
// the same file.
import termsMarkdown from '../../TERMS.md?raw';
import { acceptTerms } from '../lib/terms';

const ORANGE = '#FF5A1F';
const DARK = '#0a0a0a';
const BG = '#f5f5f3';
const FONT = 'Inter, -apple-system, sans-serif';

// First-launch (and after a terms update) acceptance screen. Rendered after
// onboarding but before the main app — the user can't reach the calculators
// until they accept. Sits in the same absolute-overlay slot as OnboardingSetup.
export function TermsGate({ onAccept }: { onAccept: () => void }) {
  function handleAccept() {
    acceptTerms();
    onAccept();
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9998, display: 'flex', flexDirection: 'column' }}>
      {/* Brand bar */}
      <div style={{ padding: '20px 24px 14px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <span style={{ fontWeight: 500, letterSpacing: '-0.8px', fontSize: 20, lineHeight: 1, fontFamily: FONT }}>
          <span style={{ color: DARK }}>set</span>
          <span style={{ color: ORANGE }}>out</span>
        </span>
      </div>

      {/* Scrollable terms */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 24px 24px' }}>
        <MarkdownBody markdown={termsMarkdown} />
      </div>

      {/* Accept footer */}
      <div style={{
        padding: '14px 24px calc(20px + env(safe-area-inset-bottom, 0px))',
        borderTop: '0.5px solid rgba(0,0,0,0.08)',
        background: '#fff',
        flexShrink: 0,
      }}>
        <button
          onClick={handleAccept}
          style={{
            width: '100%', height: 54,
            borderRadius: 16,
            background: ORANGE,
            border: 'none',
            color: '#fff',
            fontSize: 16, fontWeight: 500, fontFamily: FONT,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            boxShadow: '0 10px 24px -10px rgba(255,90,31,0.65)',
            transition: 'transform 180ms ease',
          }}
          onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          I understand and agree
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 11, color: '#999', textAlign: 'center', fontFamily: FONT, lineHeight: 1.4 }}>
          By tapping "I understand and agree" you confirm you've read and accept the Terms of Use &amp; Disclaimer.
        </p>
      </div>
    </div>
  );
}
