import { useContext, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { SettingsContext, KeyboardContext } from '../contexts';
import { useSubscription } from '../lib/SubscriptionContext';
import { DONE_BAR_HEIGHT } from './KeyboardDoneBar';

interface Props {
  onClose: () => void;
}

export function ProfileSheet({ onClose }: Props) {
  const { settings, updateSettings } = useContext(SettingsContext);
  const { inset: keyboardInset } = useContext(KeyboardContext);
  const { isPro, showPaywall } = useSubscription();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.userName);
  const nameRef = useRef<HTMLInputElement>(null);

  function startEditingName() {
    // flushSync + immediate focus keeps this inside the click's trusted
    // gesture — a focus() reached via setTimeout instead opens the iOS
    // keyboard without binding it, so nothing typed ever registers.
    flushSync(() => { setNameInput(settings.userName); setEditingName(true); });
    nameRef.current?.focus();
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed) updateSettings({ userName: trimmed });
    setEditingName(false);
  }

  const initial = (settings.userName || 'U').trim().charAt(0).toUpperCase();

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(-${keyboardInset}px)`,
          width: '100%',
          maxWidth: 390,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          // Padded (not translated) by the extra bar height, same as the other
          // keyboard-aware sheets — see KeyboardDoneBar.DONE_BAR_HEIGHT.
          padding: `20px 20px ${keyboardInset > 0 ? `${DONE_BAR_HEIGHT + 20}px` : 'calc(env(safe-area-inset-bottom) + 20px)'}`,
          zIndex: 201,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          overflowY: 'auto',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,0,0,0.12)',
            alignSelf: 'center',
            marginBottom: 24,
            flexShrink: 0,
          }}
        />

        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-orange)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#fff',
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '-0.5px',
            }}
          >
            {initial}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={nameRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  placeholder="Your name"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1.5px solid var(--color-orange)',
                    background: '#fff',
                    fontSize: 16,
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    outline: 'none',
                    minWidth: 0,
                    WebkitAppearance: 'none',
                  }}
                />
                <button
                  onClick={saveName}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--color-orange)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Save
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: 'var(--color-text)',
                    letterSpacing: '-0.4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {settings.userName || 'Your name'}
                </span>
                <button
                  onClick={startEditingName}
                  style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  aria-label="Edit name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: 11,
                  fontWeight: 500,
                  color: isPro ? '#fff' : 'var(--color-muted)',
                  letterSpacing: '0.3px',
                  background: isPro ? 'var(--color-orange)' : 'var(--color-bg)',
                  border: isPro ? '0.5px solid var(--color-orange)' : '0.5px solid var(--color-border)',
                  borderRadius: 6,
                  padding: '2px 7px',
                }}
              >
                {isPro ? 'Pro plan' : 'Free plan'}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrade banner — only for non-Pro users */}
        {!isPro && (
          <button
            onClick={() => { onClose(); showPaywall(); }}
            style={{
              background: 'linear-gradient(135deg, var(--color-orange) 0%, #863bff 100%)',
              borderRadius: 14,
              padding: '16px 18px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              border: 'none',
              width: '100%',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', letterSpacing: '-0.2px' }}>
                Setout Pro
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                All calculators · unlimited use
              </div>
            </div>
            <div
              style={{
                background: '#fff',
                color: 'var(--color-orange)',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                padding: '7px 12px',
                flexShrink: 0,
                letterSpacing: '-0.1px',
              }}
            >
              Upgrade
            </div>
          </button>
        )}

        {/* Version */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>Setout v1.0.0 — built for builders</span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            padding: '14px',
            borderRadius: 14,
            border: '0.5px solid var(--color-border)',
            background: 'none',
            color: 'var(--color-muted)',
            fontSize: 15,
            fontFamily: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Close
        </button>
      </div>
    </>
  );
}
