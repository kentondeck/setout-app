import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useSettings } from './lib/useSettings';
import { useHistory } from './lib/useHistory';
import { useJobs } from './hooks/useJobs';
import { SettingsContext, HistoryContext, JobsContext } from './contexts';
import { SplashScreen } from './components/SplashScreen';
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
          <Route path="/calc/:id" element={<CalcPlaceholder />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [settings, updateSettings] = useSettings();
  const { history, addEntry, updateEntry, deleteEntry, clearAll } = useHistory();
  const jobsApi = useJobs(history, updateEntry);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {splashDone && (
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
