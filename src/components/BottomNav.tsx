import { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyboardContext } from '../contexts';
import { hapticLight } from '../lib/haptics';

// #999 on the #f5f5f3 bar is only ~2.6:1 — well under WCAG AA, and genuinely
// hard to read outdoors, which is where this app gets used. This darker grey
// is ~4.9:1 and still reads clearly as "not the active tab".
const INACTIVE = '#6b6b69';
const ACTIVE = 'var(--color-orange)';

const tabs = [
  {
    path: '/',
    label: 'Home',
    icon: (color: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/quotes',
    label: 'Quotes',
    icon: (color: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    path: '/jobs',
    label: 'Jobs',
    icon: (color: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: '/history',
    label: 'History',
    icon: (color: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: (color: string) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

interface Props {
  /** Tapping the tab you're already on scrolls that page back to the top. */
  onReselect?: () => void;
}

export function BottomNav({ onReselect }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { inset } = useContext(KeyboardContext);

  // Belt-and-braces: also watch focus events. In live-reload dev builds the
  // Capacitor Keyboard plugin's show/hide events don't always fire (Capacitor
  // sees the LAN URL as `platform: 'web'` and ignores plugin calls), so `inset`
  // stays 0 and the nav would sit above the keyboard. Focus on any editable
  // input is a reliable proxy for "keyboard is up".
  const [focusOpen, setFocusOpen] = useState(false);
  useEffect(() => {
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement && el.isContentEditable);
    const onFocusIn = (e: FocusEvent) => { if (isEditable(e.target)) setFocusOpen(true); };
    const onFocusOut = (e: FocusEvent) => {
      if (!isEditable(e.target)) return;
      setTimeout(() => {
        if (!isEditable(document.activeElement)) setFocusOpen(false);
      }, 50);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  // Being sticky (in-flow), not fixed, means this doesn't share a
  // containing block with the fixed-position sheets that sit over it —
  // with the keyboard open it was turning up stranded between a sheet
  // and the keyboard instead of hidden behind either. Simplest correct
  // behaviour: it's not useful to tap a tab while typing anyway.
  if (inset > 0 || focusOpen) return null;

  return (
    <nav
      aria-label="Main"
      style={{
        position: 'sticky',
        bottom: 0,
        background: 'rgba(245, 245, 243, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '0.5px solid var(--color-border)',
        display: 'flex',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 100,
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? pathname === '/'
          : pathname === tab.path || pathname.startsWith(tab.path + '/');
        const color = active ? ACTIVE : INACTIVE;

        return (
          <button
            key={tab.path}
            onClick={() => {
              hapticLight();
              if (active) onReselect?.();
              else navigate(tab.path);
            }}
            aria-current={active ? 'page' : undefined}
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 52,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '9px 0 7px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              // Kills the grey flash WKWebView paints over taps, since we
              // draw our own press state below.
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              transition: 'transform 140ms ease, opacity 140ms ease',
            }}
            onPointerDown={e => {
              e.currentTarget.style.transform = 'scale(0.92)';
              e.currentTarget.style.opacity = '0.65';
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
            onPointerLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {/* Second, non-colour signal for the active tab — colour alone
                isn't enough to distinguish it (and fails colour-blind users). */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                width: 18,
                height: 2.5,
                borderRadius: '0 0 3px 3px',
                background: active ? 'var(--color-orange)' : 'transparent',
                transition: 'background 180ms ease',
              }}
            />
            {tab.icon(color)}
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 600 : 500,
                color,
                letterSpacing: '0.1px',
                lineHeight: 1,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
