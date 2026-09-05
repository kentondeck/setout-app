import { useEffect, useState } from 'react';

// Reports whether an editable form control currently has focus — on mobile a
// reliable proxy for "the software keyboard is showing". Focus events fire
// regardless of Capacitor's keyboard-resize mode.
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const isEditable = (el: EventTarget | null) =>
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement && el.isContentEditable);
    const onFocusIn = (e: FocusEvent) => { if (isEditable(e.target)) setOpen(true); };
    const onFocusOut = (e: FocusEvent) => {
      if (!isEditable(e.target)) return;
      // Defer so a focus jump between two inputs doesn't briefly flap the flag.
      setTimeout(() => {
        if (!isEditable(document.activeElement)) setOpen(false);
      }, 50);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  return open;
}
