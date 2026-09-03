import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
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
