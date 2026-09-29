import { useContext } from 'react';
import { KeyboardContext } from '../contexts';
import { DONE_BAR_HEIGHT } from '../components/KeyboardDoneBar';

// How far a fixed-bottom sheet must translate up to clear both the keyboard
// and KeyboardDoneBar (which sits on top of the keyboard whenever the sheet's
// own input is focused). Every bottom sheet with a text input at/near its
// bottom edge should use this instead of the raw keyboard inset — using the
// inset alone leaves the last ~44px of the sheet (usually the primary button)
// hidden behind the done bar.
export function useSheetKeyboardOffset(): number {
  const { inset } = useContext(KeyboardContext);
  return inset > 0 ? inset + DONE_BAR_HEIGHT : 0;
}
