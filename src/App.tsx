import React, { useState, useRef, useEffect, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useSettings } from './lib/useSettings';
import { lazyPage, prefetchPages } from './lib/lazyPage';

import { useHistory } from './lib/useHistory';
import { useJobs } from './hooks/useJobs';
import { useKeyboardInset } from './lib/useKeyboardInset';
import { SettingsContext, HistoryContext, JobsContext, KeyboardContext } from './contexts';
import { SubscriptionProvider } from './lib/SubscriptionContext';
import { Paywall } from './components/Paywall';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingSetup } from './pages/OnboardingSetup';
import { BottomNav } from './components/BottomNav';
import { UpdateBanner } from './components/UpdateBanner';
import { KeyboardDoneBar } from './components/KeyboardDoneBar';
import { Home } from './pages/Home';

// Every route below is only needed once the user navigates there, and several
// (PhotoQuoteCalc, JobDetailPage, ConcreteCalc...) are large. Lazy-loading them
// keeps the initial bundle to just the shell + Home instead of ~1.2MB upfront.
const History = lazyPage(() => import('./pages/History'), 'History');
const JobsPage = lazyPage(() => import('./pages/JobsPage'), 'JobsPage');
const QuotesPage = lazyPage(() => import('./pages/QuotesPage'), 'QuotesPage');
const JobDetailPage = lazyPage(() => import('./pages/JobDetailPage'), 'JobDetailPage');
const SettingsPage = lazyPage(() => import('./pages/Settings'), 'Settings');
const PrivacyPolicy = lazyPage(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const Support = lazyPage(() => import('./pages/Support'), 'Support');
const CalcPlaceholder = lazyPage(() => import('./pages/CalcPlaceholder'), 'CalcPlaceholder');
const DeckingCalc = lazyPage(() => import('./pages/DeckingCalc'), 'DeckingCalc');
const FramingCalc = lazyPage(() => import('./pages/FramingCalc'), 'FramingCalc');
const StairsCalc = lazyPage(() => import('./pages/StairsCalc'), 'StairsCalc');
const RoofCalc = lazyPage(() => import('./pages/RoofCalc'), 'RoofCalc');
const CutlistCalc = lazyPage(() => import('./pages/CutlistCalc'), 'CutlistCalc');
const BalusterCalc = lazyPage(() => import('./pages/BalusterCalc'), 'BalusterCalc');
const ConcreteCalc = lazyPage(() => import('./pages/ConcreteCalc'), 'ConcreteCalc');
const RakedWallCalc = lazyPage(() => import('./pages/RakedWallCalc'), 'RakedWallCalc');
const CladdingCalc = lazyPage(() => import('./pages/CladdingCalc'), 'CladdingCalc');
const SetoutCalc = lazyPage(() => import('./pages/SetoutCalc'), 'SetoutCalc');
const RoofingCalc = lazyPage(() => import('./pages/RoofingCalc'), 'RoofingCalc');
const ExcavationCalc = lazyPage(() => import('./pages/ExcavationCalc'), 'ExcavationCalc');
const GradientCalc = lazyPage(() => import('./pages/GradientCalc'), 'GradientCalc');
const EqualSpacingCalc = lazyPage(() => import('./pages/EqualSpacingCalc'), 'EqualSpacingCalc');
const FencingCalc = lazyPage(() => import('./pages/FencingCalc'), 'FencingCalc');
const Sequencer = lazyPage(() => import('./pages/Sequencer'), 'Sequencer', { prefetch: false });
const PhotoQuoteCalc = lazyPage(() => import('./pages/PhotoQuoteCalc'), 'PhotoQuoteCalc', { prefetch: false });
const ReceiptsPage = lazyPage(() => import('./pages/ReceiptsPage'), 'ReceiptsPage');
const ToolsPage = lazyPage(() => import('./pages/ToolsPage'), 'ToolsPage');



function AppShell() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div ref={scrollRef} className="route-scroller" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <Suspense fallback={<div style={{ background: 'var(--color-bg)', minHeight: '100%' }} />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/history" element={<History />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/support" element={<Support />} />
          <Route path="/calc/decking" element={<DeckingCalc />} />
          <Route path="/calc/framing" element={<FramingCalc />} />
          <Route path="/calc/stairs" element={<StairsCalc />} />
          <Route path="/calc/roof" element={<RoofCalc />} />
          <Route path="/calc/cutlist" element={<CutlistCalc />} />
          <Route path="/calc/baluster" element={<BalusterCalc />} />
          <Route path="/calc/concrete" element={<ConcreteCalc />} />
          <Route path="/calc/raked" element={<RakedWallCalc />} />
          <Route path="/calc/cladding" element={<CladdingCalc />} />
          <Route path="/calc/setout" element={<SetoutCalc />} />
          <Route path="/calc/roofing" element={<RoofingCalc />} />
          <Route path="/calc/excavation" element={<ExcavationCalc />} />
          <Route path="/calc/gradient" element={<GradientCalc />} />
          <Route path="/calc/equalspacing" element={<EqualSpacingCalc />} />
          <Route path="/calc/fencing" element={<FencingCalc />} />
          <Route path="/calc/sequencer" element={<Sequencer />} />
          <Route path="/calc/photoquote" element={<PhotoQuoteCalc />} />
          <Route path="/calc/receipts" element={<ReceiptsPage />} />
          <Route path="/calc/tools" element={<ToolsPage />} />
          <Route path="/calc/:id" element={<CalcPlaceholder />} />
        </Routes>
        </Suspense>
      </div>
      <BottomNav onReselect={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} />
      <UpdateBanner />
      <KeyboardDoneBar />
    </div>
  );
}

// Process URL params once at module load — synchronous localStorage writes before any render
const _params = new URLSearchParams(window.location.search);
if (_params.get('reset') === 'true') {
  localStorage.removeItem('setout_install_seen');
  localStorage.removeItem('setout_thankyou_seen');
  localStorage.removeItem('setout_user_name');
  localStorage.removeItem('setout_region');
  localStorage.removeItem('setout_settings');
}
if (_params.has('reset')) {
  window.history.replaceState({}, '', window.location.pathname);
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);

  // First launch only — once a region is stored, this never shows again.
  const [setupDone, setSetupDone] = useState(() => {
    return !!localStorage.getItem('setout_region');
  });

  const [settings, updateSettings] = useSettings();
  const { history, addEntry, updateEntry, deleteEntry, clearAll } = useHistory();
  const jobsApi = useJobs(history, updateEntry);
  const keyboardInset = useKeyboardInset();

  const onboardingDone = splashDone && setupDone;

  useEffect(() => {
    if (onboardingDone) prefetchPages();
  }, [onboardingDone]);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {splashDone && !setupDone && (
        <OnboardingSetup onComplete={() => setSetupDone(true)} updateSettings={updateSettings} />
      )}

      {onboardingDone && (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
          <HistoryContext.Provider value={{ history, addEntry, updateEntry, deleteEntry, clearAll }}>
            <JobsContext.Provider value={jobsApi}>
              <KeyboardContext.Provider value={{ inset: keyboardInset }}>
                <SubscriptionProvider>
                  <HashRouter>
                    <AppShell />
                  </HashRouter>
                  <Paywall />
                </SubscriptionProvider>
              </KeyboardContext.Provider>
            </JobsContext.Provider>
          </HistoryContext.Provider>
        </SettingsContext.Provider>
      )}
    </>
  );
}
