import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';

// capacitor.config.ts sets Keyboard resize:'none', so nothing repositions
// fixed-bottom UI automatically — this reads the actual keyboard height
// from the plugin's own show/hide events so BottomNav and sheet components
// can offset themselves directly instead of guessing from viewport size.
//
// We check for the Capacitor bridge on window rather than
// `Capacitor.isNativePlatform()` because live-reload dev builds load from
// the Mac's LAN URL, which makes Capacitor report `platform: 'web'` even
// though the native bridge is injected and the plugin is fully wired up.
// Checking `window.Capacitor` catches both dev and prod.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as unknown as { Capacitor?: unknown }).Capacitor) return;

    const showSub = Keyboard.addListener('keyboardWillShow', info => {
      setInset(info.keyboardHeight);
    }).catch(() => null);
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setInset(0);
    }).catch(() => null);

    return () => {
      showSub.then(s => s?.remove());
      hideSub.then(s => s?.remove());
    };
  }, []);

  return inset;
}
