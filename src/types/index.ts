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
  calcOrder: CalculatorId[]; // tradie's custom drag-reordered tile order; missing/unknown ids fall back to CALCULATORS order
  employees: Employee[];
  businessName: string;
  businessNumber: string; // ABN (AU) or GST number (NZ) — label follows region
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  licenceNumber: string; // builder's licence (AU, e.g. QBCC) or LBP number (NZ)
  paymentTerms: string;
  bankAccountName: string;
  bankBSB: string; // AU only
  bankAccountNumber: string;
  nextQuoteNumber: number;
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

export interface CustomOrderLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
}

export type SavedJob = {
  id: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  calculationIds: string[];
  orderQtyOverrides?: Record<string, number>; // auto-generated order line id -> tradie-edited qty
  orderRemovedIds?: string[];                 // auto-generated order line ids the tradie removed
  orderExtraLines?: CustomOrderLine[];        // materials the tradie added manually
  orderLineOverrides?: Record<string, { name?: string; unit?: string }>; // auto-generated order line id -> tradie-edited name/unit
};
