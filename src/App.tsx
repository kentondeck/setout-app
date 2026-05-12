import { createContext } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSettings } from './lib/useSettings';
import { useHistory } from './lib/useHistory';
import type { Settings, HistoryEntry } from './types';
import { BottomNav } from './components/BottomNav';
import { Home } from './pages/Home';
import { History } from './pages/History';
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

interface SettingsCtx {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}

interface HistoryCtx {
  history: HistoryEntry[];
  addEntry: (entry: HistoryEntry) => void;
  updateEntry: (id: string, patch: Partial<HistoryEntry>) => void;
  deleteEntry: (id: string) => void;
  clearAll: () => void;
}

export const SettingsContext = createContext<SettingsCtx>({
  settings: { unit: 'metric', apprenticeMode: false, userName: '', voiceInput: true, region: 'AU' },
  updateSettings: () => {},
});

export const HistoryContext = createContext<HistoryCtx>({
  history: [],
  addEntry: () => {},
  updateEntry: () => {},
  deleteEntry: () => {},
  clearAll: () => {},
});

function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100svh', width: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
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
          <Route path="/calc/:id" element={<CalcPlaceholder />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export function App() {
  const [settings, updateSettings] = useSettings();
  const { history, addEntry, updateEntry, deleteEntry, clearAll } = useHistory();

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      <HistoryContext.Provider value={{ history, addEntry, updateEntry, deleteEntry, clearAll }}>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </HistoryContext.Provider>
    </SettingsContext.Provider>
  );
}
