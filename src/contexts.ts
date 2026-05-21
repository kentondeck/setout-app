import { createContext } from 'react';
import type { Settings, HistoryEntry, SavedJob } from './types';

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
  settings: {
    unit: 'metric',
    apprenticeMode: false,
    userName: '',
    region: 'AU',
    pinnedCalcs: [],
  },
  updateSettings: () => {},
});

export const HistoryContext = createContext<HistoryCtx>({
  history: [],
  addEntry: () => {},
  updateEntry: () => {},
  deleteEntry: () => {},
  clearAll: () => {},
});

interface JobsCtx {
  jobs: SavedJob[];
  createJob: (name: string) => SavedJob;
  updateJob: (id: string, updates: Partial<SavedJob>) => void;
  deleteJob: (id: string) => void;
  addCalculationToJob: (jobId: string, calculationId: string) => void;
  removeCalculationFromJob: (jobId: string, calculationId: string) => void;
  getJobCalculations: (jobId: string) => HistoryEntry[];
}

export const JobsContext = createContext<JobsCtx>({
  jobs: [],
  createJob: () => ({ id: '', name: '', notes: '', createdAt: '', updatedAt: '', calculationIds: [] }),
  updateJob: () => {},
  deleteJob: () => {},
  addCalculationToJob: () => {},
  removeCalculationFromJob: () => {},
  getJobCalculations: () => [],
});
