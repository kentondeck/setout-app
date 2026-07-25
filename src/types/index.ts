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
  | 'fencing'
  | 'photoquote';

export type Region = 'AU' | 'NZ';

export interface Employee {
  id: string;
  name: string;
  role: string;       // e.g. "2nd year apprentice", "Carpenter"
  payRate: number;    // $/hr — what you pay them
  chargeRate: number; // $/hr — what you charge the client for them
}

export interface Settings {
  unit: 'metric' | 'imperial';
  apprenticeMode: boolean;
  userName: string;
  region: Region;
  pinnedCalcs: CalculatorId[];
  employees: Employee[];
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
