import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useSettings } from './lib/useSettings';

import { useHistory } from './lib/useHistory';
import { useJobs } from './hooks/useJobs';
import { SettingsContext, HistoryContext, JobsContext } from './contexts';
import { SplashScreen } from './components/SplashScreen';
import { OnboardingName } from './pages/OnboardingName';
import { OnboardingRegion } from './pages/OnboardingRegion';
import { OnboardingRole } from './pages/OnboardingRole';
import { OnboardingEmail } from './pages/OnboardingEmail';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { History } from './pages/History';

import { JobsPage } from './pages/JobsPage';
import { QuotesPage } from './pages/QuotesPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { Settings as SettingsPage } from './pages/Settings';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Support } from './pages/Support';
import { CalcPlaceholder } from './pages/CalcPlaceholder';
import { DeckingCalc } from './pages/DeckingCalc';
import { FramingCalc } from './pages/FramingCalc';
import { StairsCalc } from './pages/StairsCalc';
import { RoofCalc } from './pages/RoofCalc';
import { CutlistCalc } from './pages/CutlistCalc';
import { BalusterCalc } from './pages/BalusterCalc';
import { ConcreteCalc } from './pages/ConcreteCalc';
import { RakedWallCalc } from './pages/RakedWallCalc';
import { CladdingCalc } from './pages/CladdingCalc';
import { SetoutCalc } from './pages/SetoutCalc';
import { RoofingCalc } from './pages/RoofingCalc';
import { ExcavationCalc } from './pages/ExcavationCalc';
import { GradientCalc } from './pages/GradientCalc';
import { EqualSpacingCalc } from './pages/EqualSpacingCalc';
import { FencingCalc } from './pages/FencingCalc';
import { PhotoQuoteCalc } from './pages/PhotoQuoteCalc';



function AppShell() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
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
      </div>
      <BottomNav />
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

  const onboardingDone = splashDone && nameDone && regionDone && roleDone && emailDone;

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {splashDone && !nameDone && (
        <OnboardingName onComplete={() => setNameDone(true)} />
      )}

      {splashDone && nameDone && !regionDone && (
        <OnboardingRegion onComplete={() => setRegionDone(true)} />
      )}

      {splashDone && nameDone && regionDone && !roleDone && (
        <OnboardingRole onComplete={() => setRoleDone(true)} />
      )}

      {splashDone && nameDone && regionDone && roleDone && !emailDone && (
        <OnboardingEmail onComplete={() => setEmailDone(true)} />
      )}

      {onboardingDone && (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
          <HistoryContext.Provider value={{ history, addEntry, updateEntry, deleteEntry, clearAll }}>
            <JobsContext.Provider value={jobsApi}>
              <HashRouter>
                <AppShell />
              </HashRouter>
            </JobsContext.Provider>
          </HistoryContext.Provider>
        </SettingsContext.Provider>
      )}
    </>
  );
}
