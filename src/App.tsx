import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useSettings } from './lib/useSettings';

import { useHistory } from './lib/useHistory';
import { useJobs } from './hooks/useJobs';
import { useKeyboardInset } from './lib/useKeyboardInset';
import { SettingsContext, HistoryContext, JobsContext, KeyboardContext } from './contexts';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingName } from './pages/OnboardingName';
import { OnboardingRegion } from './pages/OnboardingRegion';
import { OnboardingRole } from './pages/OnboardingRole';
import { OnboardingEmail } from './pages/OnboardingEmail';
import { BottomNav } from './components/BottomNav';
import { UpdateBanner } from './components/UpdateBanner';
import { Home } from './pages/Home';

// Every route below is only needed once the user navigates there, and several
// (PhotoQuoteCalc, JobDetailPage, ConcreteCalc...) are large. Lazy-loading them
// keeps the initial bundle to just the shell + Home instead of ~1.2MB upfront.
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const JobsPage = lazy(() => import('./pages/JobsPage').then(m => ({ default: m.JobsPage })));
const QuotesPage = lazy(() => import('./pages/QuotesPage').then(m => ({ default: m.QuotesPage })));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage').then(m => ({ default: m.JobDetailPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));
const CalcPlaceholder = lazy(() => import('./pages/CalcPlaceholder').then(m => ({ default: m.CalcPlaceholder })));
const DeckingCalc = lazy(() => import('./pages/DeckingCalc').then(m => ({ default: m.DeckingCalc })));
const FramingCalc = lazy(() => import('./pages/FramingCalc').then(m => ({ default: m.FramingCalc })));
const StairsCalc = lazy(() => import('./pages/StairsCalc').then(m => ({ default: m.StairsCalc })));
const RoofCalc = lazy(() => import('./pages/RoofCalc').then(m => ({ default: m.RoofCalc })));
const CutlistCalc = lazy(() => import('./pages/CutlistCalc').then(m => ({ default: m.CutlistCalc })));
const BalusterCalc = lazy(() => import('./pages/BalusterCalc').then(m => ({ default: m.BalusterCalc })));
const ConcreteCalc = lazy(() => import('./pages/ConcreteCalc').then(m => ({ default: m.ConcreteCalc })));
const RakedWallCalc = lazy(() => import('./pages/RakedWallCalc').then(m => ({ default: m.RakedWallCalc })));
const CladdingCalc = lazy(() => import('./pages/CladdingCalc').then(m => ({ default: m.CladdingCalc })));
const SetoutCalc = lazy(() => import('./pages/SetoutCalc').then(m => ({ default: m.SetoutCalc })));
const RoofingCalc = lazy(() => import('./pages/RoofingCalc').then(m => ({ default: m.RoofingCalc })));
const ExcavationCalc = lazy(() => import('./pages/ExcavationCalc').then(m => ({ default: m.ExcavationCalc })));
const GradientCalc = lazy(() => import('./pages/GradientCalc').then(m => ({ default: m.GradientCalc })));
const EqualSpacingCalc = lazy(() => import('./pages/EqualSpacingCalc').then(m => ({ default: m.EqualSpacingCalc })));
const FencingCalc = lazy(() => import('./pages/FencingCalc').then(m => ({ default: m.FencingCalc })));
const PhotoQuoteCalc = lazy(() => import('./pages/PhotoQuoteCalc').then(m => ({ default: m.PhotoQuoteCalc })));



function AppShell() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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
          <Route path="/calc/photoquote" element={<PhotoQuoteCalc />} />
          <Route path="/calc/:id" element={<CalcPlaceholder />} />
        </Routes>
        </Suspense>
      </div>
      <BottomNav />
      <UpdateBanner />
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
}
if (_params.has('reset')) {
  window.history.replaceState({}, '', window.location.pathname);
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);

  const [nameDone, setNameDone] = useState(() => {
    return !!localStorage.getItem('setout_user_name');
  });

  const [regionDone, setRegionDone] = useState(() => {
    return !!localStorage.getItem('setout_region');
  });

  const [roleDone, setRoleDone] = useState(() => {
    return !!localStorage.getItem('setout_role');
  });

  const [emailDone, setEmailDone] = useState(() => {
    return localStorage.getItem('setout_email_done') === 'true';
  });

  const [settings, updateSettings] = useSettings();
  const { history, addEntry, updateEntry, deleteEntry, clearAll } = useHistory();
  const jobsApi = useJobs(history, updateEntry);
  const keyboardInset = useKeyboardInset();

  const onboardingDone = splashDone && nameDone && regionDone && roleDone && emailDone;

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {splashDone && !nameDone && (
        <OnboardingName onComplete={() => setNameDone(true)} updateSettings={updateSettings} />
      )}

      {splashDone && nameDone && !regionDone && (
        <OnboardingRegion onComplete={() => setRegionDone(true)} updateSettings={updateSettings} />
      )}

      {splashDone && nameDone && regionDone && !roleDone && (
        <OnboardingRole onComplete={() => setRoleDone(true)} updateSettings={updateSettings} />
      )}

      {splashDone && nameDone && regionDone && roleDone && !emailDone && (
        <OnboardingEmail onComplete={() => setEmailDone(true)} />
      )}

      {onboardingDone && (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
          <HistoryContext.Provider value={{ history, addEntry, updateEntry, deleteEntry, clearAll }}>
            <JobsContext.Provider value={jobsApi}>
              <KeyboardContext.Provider value={{ inset: keyboardInset }}>
                <HashRouter>
                  <AppShell />
                </HashRouter>
              </KeyboardContext.Provider>
            </JobsContext.Provider>
          </HistoryContext.Provider>
        </SettingsContext.Provider>
      )}
    </>
  );
}
