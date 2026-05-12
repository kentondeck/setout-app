export type CalculatorId =
  | 'decking'
  | 'framing'
  | 'stairs'
  | 'roof'
  | 'cutlist'
  | 'baluster'
  | 'concrete'
  | 'raked'
  | 'cladding';

export type Region = 'AU' | 'NZ';

export interface Settings {
  unit: 'metric' | 'imperial';
  apprenticeMode: boolean;
  userName: string;
  voiceInput: boolean;
  region: Region;
}

export interface HistoryEntry {
  id: string;
  calculatorId: CalculatorId;
  timestamp: number;
  inputs: Record<string, number | string>;
  outputs: Record<string, number | string>;
  jobName?: string;
  notes?: string;
}
