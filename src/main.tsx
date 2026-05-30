import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import posthog from 'posthog-js'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import './index.css'
import { App } from './App.tsx'

posthog.init('phc_w2RtHPcia9hdRYyqi4Z2kYUNoyZiJS3Rheq2h24pVQbB', {
  api_host: 'https://us.i.posthog.com',
  capture_pageview: false,
  capture_pageleave: true,
  session_recording: { maskAllInputs: false },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
