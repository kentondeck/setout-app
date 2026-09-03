import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

// navigator.vibrate() is a silent no-op on iOS WKWebView — every "Calculate"
// tap and drag-reorder was firing it and getting nothing. Capacitor's native
// Haptics plugin is what actually buzzes on device; vibrate() stays as the
// fallback for the plain web build (Android/desktop testing).
function fire(style: ImpactStyle, webFallbackMs: number) {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style }).catch(() => {});
  } else if (navigator.vibrate) {
    navigator.vibrate(webFallbackMs);
  }
}

export function hapticLight() {
  fire(ImpactStyle.Light, 12);
}

export function hapticMedium() {
  fire(ImpactStyle.Medium, 30);
}
