import { useContext, useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { KeyboardContext } from '../contexts';

// iOS's decimal/number keypad — what almost every input in this app uses —
// has no Return or Done key of its own, and scrollEnabled:false (see
// capacitor.config.ts) also disables the usual "drag down to dismiss"
// fallback. Without this bar there was no way to close the keyboard
// anywhere in the app short of tapping into a different field.
// Every fixed-bottom sheet that shifts up to clear the keyboard needs to clear
// this bar too — it sits on top of the keyboard whenever a sheet's own input
// is focused, so a sheet that only accounts for keyboard height gets its
// bottom (usually the primary button) covered by this bar. useSheetKeyboardOffset
// is the one place both numbers are combined.
export const DONE_BAR_HEIGHT = 44;

function isTextEntry(el: EventTarget | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'file', 'color'].includes(el.type);
  }
  return false;
}

export function KeyboardDoneBar() {
  const { inset } = useContext(KeyboardContext);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    function onFocusIn(e: FocusEvent) { setFocused(isTextEntry(e.target)); }
    function onFocusOut() { setFocused(false); }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  if (!focused || inset === 0) return null;

  function dismiss() {
    (document.activeElement as HTMLElement | null)?.blur();
    Keyboard.hide().catch(() => {});
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: inset,
        height: 44,
        background: 'var(--color-bg)',
        borderTop: '0.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 16px',
        zIndex: 300,
      }}
    >
      <button
        onClick={dismiss}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-orange)',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          padding: '8px 4px',
        }}
      >
        Done
      </button>
    </div>
  );
}
