export type CalculatorId =
  | 'decking'
  | 'framing'
  | 'stairs'
  | 'roof'
  | 'cutlist'
  | 'baluster'
  | 'concrete'
  | 'raked'
  | 'cladding'
  | 'setout'
  | 'codecheck'
  | 'roofing'
  | 'excavation'
  | 'gradient'
  | 'equalspacing'
  | 'fencing';

export type Region = 'AU' | 'NZ';

export interface Settings {
  unit: 'metric' | 'imperial';
  apprenticeMode: boolean;
  userName: string;
  region: Region;
  pinnedCalcs: CalculatorId[];
}

export interface HistoryEntry {
  id: string;
  calculatorId: CalculatorId;
  timestamp: number;
  inputs: Record<string, number | string>;
  outputs: Record<string, number | string>;
  jobName?: string;
  notes?: string;
  jobId?: string;
}

export type SavedJob = {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  calculationIds: string[];
};
