import { createContext } from 'react';
import type { Settings, HistoryEntry } from './types';

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
  settings: { unit: 'metric', apprenticeMode: false, userName: '', voiceInput: true, region: 'AU', pinnedCalcs: [] },
  updateSettings: () => {},
});

export const HistoryContext = createContext<HistoryCtx>({
  history: [],
  addEntry: () => {},
  updateEntry: () => {},
  deleteEntry: () => {},
  clearAll: () => {},
});
