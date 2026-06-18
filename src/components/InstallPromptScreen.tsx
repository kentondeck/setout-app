import { useEffect, useState } from 'react';

const ORANGE  = '#FF5A1F';
const DARK    = '#0a0a0a';
const MUTED   = '#999';
const BG      = '#f5f5f3';
const FONT    = "Inter, -apple-system, sans-serif";

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detect in-app browsers (Instagram, Facebook, Messenger, TikTok, etc.) — these
// don't expose "Add to Home Screen", so the install steps below are useless
// until the user opens the link in their real browser.
const isInAppBrowser = (() => {
  const ua = navigator.userAgent;
  return /FBA[NV]|FB_IAB|FBSV|Instagram|Line\/|Twitter|TikTok|musical_ly|BytedanceWebview|MicroMessenger|Snapchat|Pinterest|LinkedInApp|Reddit|Discord|; wv\)/i.test(ua);
})();

// ─── SVG Diagrams ─────────────────────────────────────────────────────────────

/**
 * Safari: address bar (with ••• alternative) + bottom toolbar (share button)
 */
function SafariBottomBar() {
  return (
    <svg viewBox="0 0 360 138" style={{ width: '100%', height: 'auto', display: 'block' }}>

      {/* ── Address bar (top) ── */}
      <rect x="0" y="0" width="360" height="50" fill="#f9f9fb" />
      <line x1="0" y1="49.5" x2="360" y2="49.5" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />

      {/* URL pill */}
      <rect x="12" y="9" width="272" height="32" rx="9" fill="#e9e9ee" />
      {/* Padlock */}
      <path d="M26,26 L26,23.5 Q26,21 29,21 Q32,21 32,23.5 L32,26 Z" fill="none" stroke="#8e8e93" strokeWidth="1.2" />
      <rect x="25" y="26" width="8" height="6" rx="1.2" fill="#8e8e93" />
      {/* URL — stays well inside the pill */}
      <text x="40" y="30" fontFamily="Inter,system-ui,sans-serif" fontSize="12" fill="#3c3c43">setoutapp.com.au</text>

      {/* ••• button */}
      <rect x="292" y="9" width="56" height="32" rx="9" fill="rgba(255,90,31,0.10)" />
      <circle cx="306" cy="25" r="2.2" fill={ORANGE} opacity="0.85" />
      <circle cx="320" cy="25" r="2.2" fill={ORANGE} opacity="0.85" />
      <circle cx="334" cy="25" r="2.2" fill={ORANGE} opacity="0.85" />

      {/* ── "or" divider ── */}
      <line x1="20"  y1="58" x2="160" y2="58" stroke="rgba(0,0,0,0.09)" strokeWidth="0.5" />
      <text x="180" y="62" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="10" fill="#ccc">or</text>
      <line x1="200" y1="58" x2="340" y2="58" stroke="rgba(0,0,0,0.09)" strokeWidth="0.5" />

      {/* ── Bottom toolbar ── */}
      <rect x="0" y="66" width="360" height="72" fill="#f2f2f7" />
      <line x1="0" y1="66.5" x2="360" y2="66.5" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />

      {/* Back */}
      <polyline points="42,95 30,102 42,109" fill="none" stroke="#c7c7cc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Forward */}
      <polyline points="102,95 114,102 102,109" fill="none" stroke="#c7c7cc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Share — primary highlight + pulsing ring */}
      <rect x="158" y="74" width="44" height="56" rx="11" fill="rgba(255,90,31,0.11)" />
      <circle cx="180" cy="102" r="22" fill="none" stroke={ORANGE} strokeWidth="1.5" opacity="0.7">
        <animate attributeName="r"       from="22" to="32"  dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.7" to="0"  dur="1.6s" repeatCount="indefinite" />
      </circle>
      {/* Share icon centred at (180, 102) */}
      <path d="M171,109 L171,117 L189,117 L189,109" fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="180" y1="109" x2="180" y2="93"   stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
      <polyline points="173,99 180,92 187,99"      fill="none" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Bookmarks */}
      <path d="M246,90 L246,114 L252,110 L258,114 L258,90 Z" fill="none" stroke="#c7c7cc" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Tabs */}
      <rect x="314" y="94" width="16" height="16" rx="3.5" fill="none" stroke="#c7c7cc" strokeWidth="1.6" />
      <rect x="318" y="90" width="16" height="16" rx="3.5" fill="#f2f2f7" stroke="#c7c7cc" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * iOS share sheet — "Add to Home Screen" row highlighted with arrow
 */
function IOSShareSheet() {
  return (
    <svg viewBox="0 0 360 146" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Sheet background */}
      <rect width="360" height="146" rx="14" fill="#ffffff" />
      {/* Drag pill */}
      <rect x="163" y="8" width="34" height="4" rx="2" fill="#e0e0e5" />

      {/* Row 1: Copy — inactive */}
      <line x1="0" y1="24" x2="360" y2="24" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />
      <rect x="14" y="30" width="30" height="30" rx="8" fill="#e8e8ed" />
      {/* Copy icon (two overlapping rects) */}
      <rect x="19" y="35" width="16" height="18" rx="3" fill="none" stroke="#8e8e93" strokeWidth="1.5" />
      <rect x="23" y="31" width="16" height="18" rx="3" fill="#e8e8ed" stroke="#8e8e93" strokeWidth="1.5" />
      <text x="54" y="50" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#3c3c43">Copy</text>

      {/* Divider */}
      <line x1="0" y1="70" x2="360" y2="70" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 2: Add to Home Screen — highlighted */}
      <rect x="0" y="70" width="360" height="42" fill="rgba(255,90,31,0.06)" />
      {/* Orange accent bar on left */}
      <rect x="0" y="70" width="3" height="42" rx="1.5" fill={ORANGE} />
      {/* Orange "plus" icon box */}
      <rect x="14" y="76" width="30" height="30" rx="8" fill={ORANGE} />
      <line x1="29" y1="84" x2="29" y2="98" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="91" x2="36" y2="91" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* Label */}
      <text x="54" y="96" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fontWeight="500" fill={ORANGE}>
        Add to Home Screen
      </text>
      {/* Arrow pointing to the row */}
      <polygon points="336,91 320,83 320,99" fill={ORANGE} />
      <line x1="322" y1="91" x2="340" y2="91" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />

      {/* Divider */}
      <line x1="0" y1="112" x2="360" y2="112" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 3: Add Bookmark — inactive, fades out */}
      <rect x="14" y="118" width="30" height="28" rx="8" fill="#e8e8ed" />
      <path d="M22,120 L22,134 L29,130 L36,134 L36,120 Z"
            fill="none" stroke="#8e8e93" strokeWidth="1.4" strokeLinejoin="round" />
      <text x="54" y="137" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#c8c8cc">Add Bookmark</text>
    </svg>
  );
}

/**
 * iOS "Add to Home Screen" confirmation dialog — "Add" button highlighted
 */
function IOSConfirmDialog() {
  return (
    <svg viewBox="0 0 360 150" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Dialog background */}
      <rect width="360" height="150" rx="12" fill="#ffffff" />

      {/* Nav bar */}
      <rect width="360" height="50" rx="0" fill="#ffffff" />
      <rect x="0" y="0" width="360" height="50" rx="12" fill="#ffffff" />
      {/* Cancel button */}
      <text x="18" y="32" fontFamily="Inter,system-ui,sans-serif" fontSize="15" fill="#8e8e93">Cancel</text>
      {/* Title */}
      <text x="180" y="32" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="14" fontWeight="500" fill="#0a0a0a">
        Add to Home Screen
      </text>
      {/* Add button — ORANGE, highlighted */}
      <rect x="316" y="15" width="38" height="26" rx="8" fill="rgba(255,90,31,0.12)" />
      <text x="335" y="33" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="15" fontWeight="500" fill={ORANGE}>
        Add
      </text>
      {/* Orange glow ring on Add button */}
      <rect x="316" y="15" width="38" height="26" rx="8" fill="none" stroke={ORANGE} strokeWidth="1.5">
        <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
      </rect>

      {/* Separator */}
      <line x1="0" y1="50" x2="360" y2="50" stroke="rgba(0,0,0,0.10)" strokeWidth="0.5" />

      {/* App icon — orange rounded square */}
      <rect x="148" y="62" width="64" height="64" rx="14" fill={ORANGE} />
      {/* "S" lettermark inside icon */}
      <text x="180" y="106" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="32" fontWeight="700" fill="#ffffff" letterSpacing="-1">
        S
      </text>

      {/* App name */}
      <text x="180" y="140" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontSize="13" fill="#3c3c43">
        Setout
      </text>
    </svg>
  );
}

/**
 * Chrome address bar — three-dot menu highlighted with pulsing ring
 */
function ChromeTopBar() {
  return (
    <svg viewBox="0 0 360 56" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Toolbar background */}
      <rect width="360" height="56" fill="#ffffff" />
      <line x1="0" y1="55.5" x2="360" y2="55.5" stroke="rgba(0,0,0,0.12)" strokeWidth="0.5" />

      {/* Address bar */}
      <rect x="12" y="10" width="282" height="36" rx="18" fill="#f1f3f4" />
      {/* Padlock icon */}
      <path d="M30,28 L30,25.5 Q30,22 33,22 Q36,22 36,25.5 L36,28 Z"
            fill="none" stroke="#5f6368" strokeWidth="1.3" />
      <rect x="29" y="28" width="8" height="7" rx="1.5" fill="#5f6368" />
      {/* URL */}
      <text x="44" y="33" fontFamily="Inter,system-ui,sans-serif" fontSize="13" fill="#3c4043">
        setoutapp.com.au
      </text>

      {/* ── Three-dot menu at x=332 ── */}
      {/* Soft highlight circle */}
      <circle cx="332" cy="28" r="17" fill="rgba(255,90,31,0.10)" />
      {/* Pulsing ring */}
      <circle cx="332" cy="28" r="18" fill="none" stroke={ORANGE} strokeWidth="1.5" opacity="0.8">
        <animate attributeName="r"       from="18" to="28"  dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0"  dur="1.6s" repeatCount="indefinite" />
      </circle>
      {/* Three dots */}
      <circle cx="332" cy="20" r="2.2" fill={ORANGE} />
      <circle cx="332" cy="28" r="2.2" fill={ORANGE} />
      <circle cx="332" cy="36" r="2.2" fill={ORANGE} />
    </svg>
  );
}

/**
 * Chrome dropdown menu — "Add to Home Screen" highlighted with arrow
 */
function ChromeDropdownMenu() {
  return (
    <svg viewBox="0 0 360 148" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Menu background */}
      <rect width="360" height="148" rx="12" fill="#ffffff" />
      {/* Subtle shadow top edge */}
      <rect x="0" y="0" width="360" height="1" rx="0" fill="rgba(0,0,0,0.06)" />

      {/* Row 1: New tab */}
      <text x="18" y="36" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#5f6368">New tab</text>
      <line x1="0" y1="52" x2="360" y2="52" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 2: New incognito tab */}
      <text x="18" y="78" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#5f6368">New incognito tab</text>
      <line x1="0" y1="94" x2="360" y2="94" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 3: Add to Home Screen — highlighted */}
      <rect x="0" y="94" width="360" height="42" fill="rgba(255,90,31,0.06)" />
      {/* Orange left accent */}
      <rect x="0" y="94" width="3" height="42" rx="1.5" fill={ORANGE} />
      {/* Plus icon box */}
      <rect x="14" y="100" width="26" height="26" rx="7" fill={ORANGE} />
      <line x1="27" y1="107" x2="27" y2="119" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="113" x2="33" y2="113" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      {/* Label */}
      <text x="50" y="118" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fontWeight="500" fill={ORANGE}>
        Add to Home Screen
      </text>
      {/* Arrow */}
      <polygon points="336,113 320,105 320,121" fill={ORANGE} />

      <line x1="0" y1="136" x2="360" y2="136" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 4: Settings — faded */}
      <text x="18" y="144" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#c8c8cc">Settings</text>
    </svg>
  );
}

/**
 * In-app browser dropdown — "Open in Safari/Chrome" highlighted with arrow
 */
function InAppDropdownMenu() {
  return (
    <svg viewBox="0 0 360 148" style={{ width: '100%', height: 'auto', display: 'block' }}>
      <rect width="360" height="148" rx="12" fill="#ffffff" />
      <rect x="0" y="0" width="360" height="1" rx="0" fill="rgba(0,0,0,0.06)" />

      {/* Row 1: Copy link */}
      <text x="18" y="36" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#5f6368">Copy link</text>
      <line x1="0" y1="52" x2="360" y2="52" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 2: Share */}
      <text x="18" y="78" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#5f6368">Share…</text>
      <line x1="0" y1="94" x2="360" y2="94" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 3: Open in Browser — highlighted */}
      <rect x="0" y="94" width="360" height="42" fill="rgba(255,90,31,0.06)" />
      <rect x="0" y="94" width="3" height="42" rx="1.5" fill={ORANGE} />
      {/* External-link icon box */}
      <rect x="14" y="100" width="26" height="26" rx="7" fill={ORANGE} />
      <path d="M22,113 L34,113 M34,113 L30,109 M34,113 L30,117 M22,109 L22,121" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <text x="50" y="118" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fontWeight="500" fill={ORANGE}>
        Open in Browser
      </text>
      <polygon points="336,113 320,105 320,121" fill={ORANGE} />

      <line x1="0" y1="136" x2="360" y2="136" stroke="rgba(0,0,0,0.07)" strokeWidth="0.5" />

      {/* Row 4: Refresh — faded */}
      <text x="18" y="144" fontFamily="Inter,system-ui,sans-serif" fontSize="14.5" fill="#c8c8cc">Refresh</text>
    </svg>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({ num, diagram, label }: {
  num: number;
  diagram: React.ReactNode;
  label: string;
}) {
  return (
    <div style={{
      position: 'relative',
      background: '#fff',
      borderRadius: 16,
      border: '0.5px solid rgba(0,0,0,0.06)',
      padding: '32px 20px 20px',
      width: '100%',
    }}>
      {/* Step number badge */}
      <div style={{
        position: 'absolute', top: 12, left: 12,
        width: 24, height: 24, borderRadius: '50%',
        background: ORANGE, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 500, fontFamily: FONT,
      }}>
        {num}
      </div>

      {/* Diagram */}
      <div style={{ borderRadius: 8, overflow: 'hidden' }}>
        {diagram}
      </div>

      {/* Label */}
      <p style={{
        margin: '12px 0 0',
        fontFamily: FONT, fontSize: 14, fontWeight: 400,
        color: DARK, textAlign: 'center', lineHeight: 1.45,
      }}>
        {label}
      </p>
    </div>
  );
}

// ─── Platform step sets ───────────────────────────────────────────────────────

function IOSSteps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <StepCard
        num={1}
        diagram={<SafariBottomBar />}
        label="Tap the Share button at the bottom — or ••• in the address bar if you can't see it"
      />
      <StepCard
        num={2}
        diagram={<IOSShareSheet />}
        label="Tap 'Add to Home Screen'"
      />
      <StepCard
        num={3}
        diagram={<IOSConfirmDialog />}
        label="Tap 'Add' in the top right"
      />
    </div>
  );
}

function InAppBrowserSteps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <StepCard
        num={1}
        diagram={<ChromeTopBar />}
        label="Tap the ⋯ menu in the top right"
      />
      <StepCard
        num={2}
        diagram={<InAppDropdownMenu />}
        label="Choose 'Open in Browser'"
      />
      <p style={{
        margin: '4px 0 0',
        fontFamily: FONT, fontSize: 13, color: MUTED,
        textAlign: 'center', lineHeight: 1.5,
      }}>
        Then come back here to add Setout to your home screen.
      </p>
    </div>
  );
}

function AndroidSteps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      <StepCard
        num={1}
        diagram={<ChromeTopBar />}
        label="Tap the menu in the top right of Chrome"
      />
      <StepCard
        num={2}
        diagram={<ChromeDropdownMenu />}
        label="Tap 'Add to Home Screen'"
      />
    </div>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
}

export function InstallPromptScreen({ onComplete }: Props) {
  const [visible, setVisible]   = useState(false);
  const [exiting, setExiting]   = useState(false);
  const [toast, setToast]       = useState<string | null>(null);
  const [claimed, setClaimed]   = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast || claimed) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast, claimed]);

  function proceed() {
    localStorage.setItem('setout_install_seen', 'true');
    setExiting(true);
    setTimeout(() => onComplete(), 260);
  }

  function handleClaimed() {
    const installed = window.matchMedia('(display-mode: standalone)').matches;
    if (installed) {
      proceed();
    } else {
      setClaimed(true);
      setToast('The app should be on your home screen now — open it from there!');
    }
  }

  const isDesktop = !isIOS && !/Android/.test(navigator.userAgent);

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG, zIndex: 9998 }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '40px 24px 48px',
          overflowY: 'auto',
          opacity: exiting ? 0 : (visible ? 1 : 0),
          transform: exiting ? 'translateY(-16px)' : 'none',
          transition: exiting
            ? 'opacity 240ms ease-in, transform 240ms ease-in'
            : 'opacity 400ms ease-in',
        }}
      >
        {/* Wordmark */}
        <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, letterSpacing: '-0.8px', lineHeight: 1 }}>
          <span style={{ color: DARK }}>set</span>
          <span style={{ color: ORANGE }}>out</span>
        </span>

        {/* Heading */}
        <h1 style={{
          margin: '32px 0 0', fontFamily: FONT, fontSize: 24, fontWeight: 500,
          letterSpacing: '-0.5px', color: DARK, textAlign: 'center', lineHeight: 1.25,
        }}>
          Add Setout to your<br />home screen
        </h1>

        {/* Subtext */}
        <p style={{
          margin: '12px 0 0', fontFamily: FONT, fontSize: 15, fontWeight: 400,
          lineHeight: 1.55, color: MUTED, textAlign: 'center',
        }}>
          Takes 10 seconds. No App Store needed.
        </p>

        {/* Steps */}
        <div style={{ width: '100%', maxWidth: 380, marginTop: 28 }}>
          {isInAppBrowser ? (
            <>
              <div style={{
                background: 'rgba(255,90,31,0.07)',
                border: '0.5px solid rgba(255,90,31,0.25)',
                borderRadius: 12, padding: '12px 14px',
                marginBottom: 14,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.8px',
                  color: ORANGE, background: 'rgba(255,90,31,0.12)',
                  borderRadius: 4, padding: '2px 6px', flexShrink: 0,
                }}>
                  HEADS UP
                </span>
                <p style={{ margin: 0, fontFamily: FONT, fontSize: 13, color: DARK, lineHeight: 1.4 }}>
                  You're in an in-app browser. Open Setout in your real browser to install it.
                </p>
              </div>
              <InAppBrowserSteps />
            </>
          ) : isDesktop ? (
            <div style={{ fontFamily: FONT, fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 1.6 }}>
              <p style={{ margin: 0 }}>
                Open this page on your phone in Safari (iPhone) or Chrome (Android) to install.
              </p>
              <p style={{ margin: '16px 0 0', color: DARK, fontWeight: 500 }}>Then add it to your home screen:</p>
              <p style={{ margin: '8px 0 0' }}>
                <span style={{ color: DARK, fontWeight: 500 }}>iPhone</span> — tap <span style={{ color: ORANGE }}>Share</span> → <span style={{ color: ORANGE }}>Add to Home Screen</span>
              </p>
              <p style={{ margin: '8px 0 0' }}>
                <span style={{ color: DARK, fontWeight: 500 }}>Android</span> — tap <span style={{ color: ORANGE }}>⋮</span> → <span style={{ color: ORANGE }}>Add to Home Screen</span>
              </p>
            </div>
          ) : isIOS ? (
            <IOSSteps />
          ) : (
            <AndroidSteps />
          )}
        </div>

        {/* Primary button — hide in in-app browsers since install isn't possible from there */}
        {!isDesktop && !isInAppBrowser && !claimed && (
          <button
            onClick={handleClaimed}
            style={{
              marginTop: 32, width: '100%', maxWidth: 380, height: 56, flexShrink: 0,
              borderRadius: 16, background: ORANGE, border: 'none',
              color: '#fff', fontSize: 16, fontWeight: 500,
              fontFamily: FONT, cursor: 'pointer', letterSpacing: '-0.2px',
              transition: 'transform 180ms ease, opacity 180ms ease',
            }}
            onPointerDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.opacity = '0.9'; }}
            onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
            onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
          >
            I've added it — let's go
          </button>
        )}

        {/* Toast */}
        {toast && (
          <p style={{ margin: '10px 0 0', fontFamily: FONT, fontSize: 12, color: MUTED, textAlign: 'center' }}>
            {toast}
          </p>
        )}

        {/* Skip */}
        <button
          onClick={proceed}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            padding: '4px 0', fontFamily: FONT, fontSize: 13, fontWeight: 400,
            color: MUTED, cursor: 'pointer', textDecoration: 'underline',
            textDecorationColor: 'transparent',
            transition: 'text-decoration-color 150ms',
          }}
          onPointerDown={e => { e.currentTarget.style.textDecorationColor = MUTED; }}
          onPointerUp={e => { e.currentTarget.style.textDecorationColor = 'transparent'; }}
          onPointerLeave={e => { e.currentTarget.style.textDecorationColor = 'transparent'; }}
        >
          Skip — continue in browser
        </button>

      </div>
    </div>
  );
}
