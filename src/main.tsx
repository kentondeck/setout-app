import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
// This package's exports map has no "./*.css" entry (unlike inter/jetbrains-mono
// above), only a bare "./*" -> "./*.css" wildcard — so the ".css" suffix Vite
// needs here reads as a type error to tsc even though Vite resolves it fine.
// @ts-expect-error - see above
import '@fontsource/big-shoulders-display/700'
// @ts-expect-error - see above
import '@fontsource/big-shoulders-display/800'
// @ts-expect-error - see above
import '@fontsource/big-shoulders-display/900'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './index.css'
import { App } from './App.tsx'

// Only load analytics in browser context — Capacitor WebView skips this
if (!(window as unknown as { Capacitor?: unknown }).Capacitor) {
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', 'de37d1d5-4a7b-433d-ad41-82821f3882c6');
  document.head.appendChild(s);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
