import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import posthog from 'posthog-js';
import { useSettings } from './lib/useSettings';
import { useHistory } from './lib/useHistory';
import { useJobs } from './hooks/useJobs';
import { SettingsContext, HistoryContext, JobsContext } from './contexts';
import { SplashScreen } from './components/SplashScreen';
import { InstallPromptScreen } from './components/InstallPromptScreen';
import { BetaThankYou } from './pages/BetaThankYou';
import { OnboardingName } from './pages/OnboardingName';
import { OnboardingRegion } from './pages/OnboardingRegion';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { SavedJobs } from './pages/SavedJobs';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { Settings as SettingsPage } from './pages/Settings';
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
import { CodeCheckCalc } from './pages/CodeCheckCalc';
import { RoofingCalc } from './pages/RoofingCalc';
import { ExcavationCalc } from './pages/ExcavationCalc';
import { GradientCalc } from './pages/GradientCalc';
import { EqualSpacingCalc } from './pages/EqualSpacingCalc';
import { FencingCalc } from './pages/FencingCalc';
import { Feedback } from './pages/Feedback';


function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100svh', width: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/saved" element={<SavedJobs />} />
          <Route path="/settings" element={<SettingsPage />} />
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
          <Route path="/calc/codecheck" element={<CodeCheckCalc />} />
          <Route path="/calc/roofing" element={<RoofingCalc />} />
          <Route path="/calc/excavation" element={<ExcavationCalc />} />
          <Route path="/calc/gradient" element={<GradientCalc />} />
          <Route path="/calc/equalspacing" element={<EqualSpacingCalc />} />
          <Route path="/calc/fencing" element={<FencingCalc />} />
          <Route path="/calc/feedback" element={<Feedback />} />
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

  const [installDone, setInstallDone] = useState(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeen = localStorage.getItem('setout_install_seen') === 'true';
    return isInstalled || hasSeen;
  });

  const [thankYouDone, setThankYouDone] = useState(() => {
    return localStorage.getItem('setout_thankyou_seen') === 'true';
  });

  const [nameDone, setNameDone] = useState(() => {
    return !!localStorage.getItem('setout_user_name');
  });

  const [regionDone, setRegionDone] = useState(() => {
    return !!localStorage.getItem('setout_region');
  });

  const [settings, updateSettings] = useSettings();
  const { history, addEntry, updateEntry, deleteEntry, clearAll } = useHistory();
  const jobsApi = useJobs(history, updateEntry);

  const onboardingDone = splashDone && installDone && thankYouDone && nameDone && regionDone;

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}

      {splashDone && !installDone && (
        <InstallPromptScreen onComplete={() => { posthog.capture('onboarding_install_done'); setInstallDone(true); }} />
      )}

      {splashDone && installDone && !thankYouDone && (
        <BetaThankYou onComplete={() => { posthog.capture('onboarding_thankyou_done'); setThankYouDone(true); }} />
      )}

      {splashDone && installDone && thankYouDone && !nameDone && (
        <OnboardingName onComplete={() => { posthog.capture('onboarding_name_done'); setNameDone(true); }} />
      )}

      {splashDone && installDone && thankYouDone && nameDone && !regionDone && (
        <OnboardingRegion onComplete={() => { posthog.capture('onboarding_complete'); setRegionDone(true); }} />
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
