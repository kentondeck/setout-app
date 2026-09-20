import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import './index.css'
import { App } from './App.tsx'

// Only load analytics in browser context — Capacitor WebView skips this
if (!Capacitor.isNativePlatform()) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', 'de37d1d5-4a7b-433d-ad41-82821f3882c6');
  document.head.appendChild(s);
}

// Ask the browser / WebView not to evict our stored data under storage
// pressure. Without this, WebKit silently clears PWA localStorage after ~7
// days of inactivity — a tradie who forgets about the app for a fortnight
// comes back to an empty history. Once granted, the origin's storage stays
// until the user explicitly clears it. Fire-and-forget: no-op on browsers
// that don't support it, and the request never harms anything if it fails.
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => { /* best-effort */ });
}

// Force the iOS software keyboard to render its light theme at runtime.
// The static `Keyboard.style: 'LIGHT'` in capacitor.config.ts only sets the
// initial value — some iOS versions revert to system-follow shortly after the
// app finishes launching. Calling setStyle explicitly locks it in.
if (Capacitor.isNativePlatform()) {
  import('@capacitor/keyboard')
    .then(({ Keyboard, KeyboardStyle }) => Keyboard.setStyle({ style: KeyboardStyle.Light }))
    .catch(() => { /* plugin unavailable — ignore */ });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
