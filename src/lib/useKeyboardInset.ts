import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// capacitor.config.ts sets Keyboard resize:'none', so nothing repositions
// fixed-bottom UI automatically — this reads the actual keyboard height
// from the plugin's own show/hide events so BottomNav and sheet components
// can offset themselves directly instead of guessing from viewport size.
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const showSub = Keyboard.addListener('keyboardWillShow', info => {
      setInset(info.keyboardHeight);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setInset(0);
    });

    return () => {
      showSub.then(s => s.remove());
      hideSub.then(s => s.remove());
    };
  }, []);

  return inset;
}
